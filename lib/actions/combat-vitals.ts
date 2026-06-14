'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionEconomy, ConditionTimers } from '@/lib/types/dnd'
import {
  applyDamage,
  modifyDamage,
  applyHealing,
  setTempHp,
  concentrationDc,
  shouldPromptConcentration,
  type DamageModifier,
} from '@/lib/combat/vitals'
import {
  FRESH_ECONOMY,
  resetEconomy,
  toggleSlot,
  setMovementUsed,
  type ActionSlot,
} from '@/lib/combat/action-economy'

const COMBAT_PATH = '/app/combat'

export interface DamageResult {
  /** Set when the damaged creature was concentrating and should roll a save. */
  concentrationCheck?: { name: string; dc: number }
}

/**
 * Apply damage to a creature (temp HP soaks first). `modifier` applies the
 * target's resistance / vulnerability / immunity before the hit lands, so the
 * concentration save (if any) is based on the damage actually taken.
 */
export async function damageCreatureAction(
  creatureId: string,
  amount: number,
  modifier: DamageModifier = 'normal',
): Promise<DamageResult> {
  const supabase = await createClient()
  const { data: c } = await supabase
    .from('combat_creatures')
    .select('name, hp_current, temp_hp, concentration')
    .eq('id', creatureId)
    .single()
  if (!c) return {}

  const dealt = modifyDamage(amount, modifier)
  const next = applyDamage({ hp_current: c.hp_current, temp_hp: c.temp_hp }, dealt)
  await supabase
    .from('combat_creatures')
    .update({ hp_current: next.hp_current, temp_hp: next.temp_hp })
    .eq('id', creatureId)

  revalidatePath(COMBAT_PATH)

  if (shouldPromptConcentration(c.concentration, dealt)) {
    return { concentrationCheck: { name: c.name, dc: concentrationDc(dealt) } }
  }
  return {}
}

/** Heal a creature up to its max HP. */
export async function healCreatureAction(creatureId: string, amount: number): Promise<void> {
  const supabase = await createClient()
  const { data: c } = await supabase
    .from('combat_creatures')
    .select('hp_current, temp_hp, hp_max')
    .eq('id', creatureId)
    .single()
  if (!c) return

  const next = applyHealing({ hp_current: c.hp_current, temp_hp: c.temp_hp }, amount, c.hp_max)
  await supabase.from('combat_creatures').update({ hp_current: next.hp_current }).eq('id', creatureId)
  revalidatePath(COMBAT_PATH)
}

/** Set a creature's temp HP pool (temp HP doesn't stack). */
export async function setTempHpAction(creatureId: string, value: number): Promise<void> {
  const supabase = await createClient()
  const { data: c } = await supabase
    .from('combat_creatures')
    .select('hp_current, temp_hp')
    .eq('id', creatureId)
    .single()
  if (!c) return

  const next = setTempHp({ hp_current: c.hp_current, temp_hp: c.temp_hp }, value)
  await supabase.from('combat_creatures').update({ temp_hp: next.temp_hp }).eq('id', creatureId)
  revalidatePath(COMBAT_PATH)
}

/** Toggle a condition on/off, with an optional round duration when adding. */
export async function toggleConditionAction(
  creatureId: string,
  condition: string,
  durationRounds?: number,
): Promise<void> {
  const supabase = await createClient()
  const { data: c } = await supabase
    .from('combat_creatures')
    .select('conditions, condition_timers')
    .eq('id', creatureId)
    .single()
  if (!c) return

  const conditions = (c.conditions ?? []) as string[]
  const timers = { ...((c.condition_timers ?? {}) as ConditionTimers) }
  const has = conditions.includes(condition)

  let nextConditions: string[]
  if (has) {
    nextConditions = conditions.filter((x) => x !== condition)
    delete timers[condition]
  } else {
    nextConditions = [...conditions, condition]
    if (durationRounds && durationRounds > 0) timers[condition] = Math.floor(durationRounds)
  }

  await supabase
    .from('combat_creatures')
    .update({ conditions: nextConditions, condition_timers: timers })
    .eq('id', creatureId)
  revalidatePath(COMBAT_PATH)
}

/** Toggle whether a creature is concentrating on a spell. */
export async function toggleConcentrationAction(creatureId: string, current: boolean): Promise<void> {
  const supabase = await createClient()
  await supabase.from('combat_creatures').update({ concentration: !current }).eq('id', creatureId)
  revalidatePath(COMBAT_PATH)
}

/** Record a death save (success or failure), clamped to 0–3. */
export async function recordDeathSaveAction(creatureId: string, kind: 'success' | 'failure'): Promise<void> {
  const supabase = await createClient()
  const { data: c } = await supabase
    .from('combat_creatures')
    .select('death_save_successes, death_save_failures')
    .eq('id', creatureId)
    .single()
  if (!c) return

  const field = kind === 'success' ? 'death_save_successes' : 'death_save_failures'
  const value = Math.min(3, (kind === 'success' ? c.death_save_successes : c.death_save_failures) + 1)
  await supabase.from('combat_creatures').update({ [field]: value }).eq('id', creatureId)
  revalidatePath(COMBAT_PATH)
}

/** Reset both death-save tracks (e.g. after stabilising or healing above 0). */
export async function resetDeathSavesAction(creatureId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('combat_creatures')
    .update({ death_save_successes: 0, death_save_failures: 0 })
    .eq('id', creatureId)
  revalidatePath(COMBAT_PATH)
}

/** Flip one action-economy slot (action / bonus action / reaction) on a creature. */
export async function toggleActionSlotAction(creatureId: string, slot: ActionSlot): Promise<void> {
  const supabase = await createClient()
  const { data: c } = await supabase
    .from('combat_creatures')
    .select('action_economy')
    .eq('id', creatureId)
    .single()
  if (!c) return

  const economy = (c.action_economy ?? FRESH_ECONOMY) as ActionEconomy
  await supabase
    .from('combat_creatures')
    .update({ action_economy: toggleSlot(economy, slot) })
    .eq('id', creatureId)
  revalidatePath(COMBAT_PATH)
}

/** Record how much movement (feet) a creature has spent this turn. */
export async function setMovementUsedAction(creatureId: string, feet: number): Promise<void> {
  const supabase = await createClient()
  const { data: c } = await supabase
    .from('combat_creatures')
    .select('action_economy')
    .eq('id', creatureId)
    .single()
  if (!c) return

  const economy = (c.action_economy ?? FRESH_ECONOMY) as ActionEconomy
  await supabase
    .from('combat_creatures')
    .update({ action_economy: setMovementUsed(economy, feet) })
    .eq('id', creatureId)
  revalidatePath(COMBAT_PATH)
}

/** Reset a creature's action economy to a fresh turn (all slots back, movement zeroed). */
export async function resetActionEconomyAction(creatureId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('combat_creatures')
    .update({ action_economy: resetEconomy() })
    .eq('id', creatureId)
  revalidatePath(COMBAT_PATH)
}
