'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { CombatCreature } from '@/lib/types/dnd'
import { sortByInitiative, advanceTurn, delayCurrentTurn, insertReadiedAction } from '@/lib/combat/turn-order'

export interface ActionState {
  error?: string
}

const COMBAT_PATH = '/app/combat'

/** Start a fresh (inactive) encounter for a campaign the caller DMs. */
export async function createEncounterAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const campaignId = String(formData.get('campaign_id') ?? '')
  const name = String(formData.get('name') ?? 'Encounter').trim() || 'Encounter'
  if (!campaignId) return { error: 'Missing campaign.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('combat_encounters')
    .insert({ campaign_id: campaignId, name })

  if (error) return { error: error.message }

  revalidatePath(COMBAT_PATH)
  return {}
}

/** Add a combatant to an encounter's roster. */
export async function addCombatantAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const encounterId = String(formData.get('encounter_id') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const dexMod = Number(formData.get('dex_mod') ?? 0) || 0
  const hpMax = Math.max(1, Number(formData.get('hp_max') ?? 10) || 10)
  const ac = Math.max(0, Number(formData.get('ac') ?? 10) || 10)
  const isPlayer = formData.get('is_player') === 'on'

  if (!encounterId) return { error: 'Missing encounter.' }
  if (!name) return { error: 'Give the combatant a name.' }

  const supabase = await createClient()
  const { error } = await supabase.from('combat_creatures').insert({
    encounter_id: encounterId,
    name,
    dex_mod: dexMod,
    hp_current: hpMax,
    hp_max: hpMax,
    ac,
    is_player: isPlayer,
  })

  if (error) return { error: error.message }

  revalidatePath(COMBAT_PATH)
  return {}
}

export async function removeCombatantAction(creatureId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('combat_creatures').delete().eq('id', creatureId)
  revalidatePath(COMBAT_PATH)
}

/** Roll 1d20 + the combatant's DEX modifier and record it as their initiative. */
export async function rollInitiativeAction(creatureId: string, dexMod: number): Promise<void> {
  const roll = Math.floor(Math.random() * 20) + 1
  const supabase = await createClient()
  await supabase
    .from('combat_creatures')
    .update({ initiative: roll + dexMod })
    .eq('id', creatureId)
  revalidatePath(COMBAT_PATH)
}

/** Manually set a combatant's initiative (e.g. a player calling out their roll). */
export async function setInitiativeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const creatureId = String(formData.get('creature_id') ?? '')
  const initiative = Number(formData.get('initiative') ?? '')
  if (!creatureId || Number.isNaN(initiative)) return { error: 'Enter a number.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('combat_creatures')
    .update({ initiative })
    .eq('id', creatureId)

  if (error) return { error: error.message }

  revalidatePath(COMBAT_PATH)
  return {}
}

/** Sort the roster by initiative and start the encounter at round 1. */
export async function startCombatAction(encounterId: string): Promise<void> {
  const supabase = await createClient()
  const { data: creatures } = await supabase
    .from('combat_creatures')
    .select('id, initiative')
    .eq('encounter_id', encounterId)
    .eq('is_active', true)

  const order = sortByInitiative((creatures ?? []) as Pick<CombatCreature, 'id' | 'initiative'>[])

  await supabase
    .from('combat_encounters')
    .update({ is_active: true, round_number: 1, current_turn_index: 0, initiative_order: order })
    .eq('id', encounterId)

  revalidatePath(COMBAT_PATH)
}

/** Advance to the next combatant's turn, rolling over to the next round if needed. */
export async function nextTurnAction(encounterId: string): Promise<void> {
  const supabase = await createClient()
  const { data: encounter } = await supabase
    .from('combat_encounters')
    .select('initiative_order, round_number, current_turn_index')
    .eq('id', encounterId)
    .single()

  if (!encounter) return

  const pointer = advanceTurn(encounter.initiative_order as string[], {
    round_number: encounter.round_number,
    current_turn_index: encounter.current_turn_index,
  })

  await supabase
    .from('combat_encounters')
    .update({ round_number: pointer.round_number, current_turn_index: pointer.current_turn_index })
    .eq('id', encounterId)

  revalidatePath(COMBAT_PATH)
}

/** The current combatant delays: they act last this round, and play passes to whoever was next. */
export async function delayTurnAction(encounterId: string): Promise<void> {
  const supabase = await createClient()
  const { data: encounter } = await supabase
    .from('combat_encounters')
    .select('initiative_order, round_number, current_turn_index')
    .eq('id', encounterId)
    .single()

  if (!encounter) return

  const order = delayCurrentTurn(encounter.initiative_order as string[], {
    round_number: encounter.round_number,
    current_turn_index: encounter.current_turn_index,
  })

  const delayedId = (encounter.initiative_order as string[])[encounter.current_turn_index]

  await supabase
    .from('combat_encounters')
    .update({ initiative_order: order })
    .eq('id', encounterId)
  await supabase
    .from('combat_creatures')
    .update({ turn_status: 'delayed' })
    .eq('id', delayedId)

  revalidatePath(COMBAT_PATH)
}

/** Toggle a combatant between holding their action and normal. */
export async function toggleHoldAction(creatureId: string, currentStatus: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('combat_creatures')
    .update({ turn_status: currentStatus === 'holding' ? 'normal' : 'holding' })
    .eq('id', creatureId)
  revalidatePath(COMBAT_PATH)
}

/** A holding combatant reacts now: they act in the current turn slot. */
export async function readyActionAction(encounterId: string, creatureId: string): Promise<void> {
  const supabase = await createClient()
  const { data: encounter } = await supabase
    .from('combat_encounters')
    .select('initiative_order, round_number, current_turn_index')
    .eq('id', encounterId)
    .single()

  if (!encounter) return

  const order = insertReadiedAction(encounter.initiative_order as string[], {
    round_number: encounter.round_number,
    current_turn_index: encounter.current_turn_index,
  }, creatureId)

  await supabase
    .from('combat_encounters')
    .update({ initiative_order: order })
    .eq('id', encounterId)
  await supabase
    .from('combat_creatures')
    .update({ turn_status: 'normal' })
    .eq('id', creatureId)

  revalidatePath(COMBAT_PATH)
}

/** End the encounter, returning the campaign to no-active-combat state. */
export async function endEncounterAction(encounterId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('combat_encounters')
    .update({ is_active: false })
    .eq('id', encounterId)
  revalidatePath(COMBAT_PATH)
}
