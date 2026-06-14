'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { PartyGroup, MonsterGroup } from '@/lib/encounter/difficulty'
import {
  normalizeParty,
  normalizeMonsters,
  normalizeTemplateName,
} from '@/lib/encounter/templates'
import { monsterCombatantDrafts } from '@/lib/combat/launch'

const ENCOUNTERS_PATH = '/app/encounters'
const COMBAT_PATH = '/app/combat'

export interface TemplateActionState {
  error?: string
}

/**
 * Save the current calculator configuration as a new template for a campaign.
 * RLS enforces that the caller DMs the campaign; we normalise the inputs first
 * so a malformed client payload can never persist junk. created_by is pinned to
 * the authenticated user to satisfy the insert policy.
 */
export async function saveEncounterTemplateAction(
  campaignId: string,
  name: string,
  party: PartyGroup[],
  monsters: MonsterGroup[],
): Promise<TemplateActionState> {
  if (!campaignId) return { error: 'Missing campaign.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.from('encounter_templates').insert({
    campaign_id: campaignId,
    created_by: user.id,
    name: normalizeTemplateName(name),
    party: normalizeParty(party),
    monsters: normalizeMonsters(monsters),
  })
  if (error) return { error: error.message }

  revalidatePath(ENCOUNTERS_PATH)
  return {}
}

/** Overwrite an existing template with new state (RLS limits this to its DM). */
export async function updateEncounterTemplateAction(
  id: string,
  name: string,
  party: PartyGroup[],
  monsters: MonsterGroup[],
): Promise<TemplateActionState> {
  if (!id) return { error: 'Missing template.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('encounter_templates')
    .update({
      name: normalizeTemplateName(name),
      party: normalizeParty(party),
      monsters: normalizeMonsters(monsters),
    })
    .eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(ENCOUNTERS_PATH)
  return {}
}

/** Delete a saved template (RLS limits this to its campaign's DM). */
export async function deleteEncounterTemplateAction(id: string): Promise<TemplateActionState> {
  if (!id) return { error: 'Missing template.' }

  const supabase = await createClient()
  const { error } = await supabase.from('encounter_templates').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(ENCOUNTERS_PATH)
  return {}
}

/**
 * Push the calculator's monster line-up into a new encounter for the campaign
 * and send the DM to the tracker to roll initiative. Linking the campaign's
 * player characters as combatants lands once the character sheet (KAN-13)
 * ships. RLS limits encounter/combatant creation to the campaign's DM.
 *
 * Refuses to launch while the campaign already has an active encounter, so a
 * stray click can't bury a fight in progress.
 */
export async function launchEncounterAction(
  campaignId: string,
  monsters: MonsterGroup[],
): Promise<TemplateActionState> {
  if (!campaignId) return { error: 'Missing campaign.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: active } = await supabase
    .from('combat_encounters')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('is_active', true)
    .limit(1)
  if (active && active.length > 0) {
    return { error: 'An encounter is already active for this campaign. Finish it before launching a new one.' }
  }

  const { data: encounter, error: encounterError } = await supabase
    .from('combat_encounters')
    .insert({ campaign_id: campaignId, name: 'Encounter' })
    .select('id')
    .single()
  if (encounterError || !encounter) return { error: encounterError?.message ?? 'Could not create encounter.' }

  const drafts = monsterCombatantDrafts(normalizeMonsters(monsters))
  if (drafts.length > 0) {
    const { error: combatantsError } = await supabase
      .from('combat_creatures')
      .insert(drafts.map((d) => ({ ...d, encounter_id: encounter.id })))
    if (combatantsError) return { error: combatantsError.message }
  }

  revalidatePath(ENCOUNTERS_PATH)
  revalidatePath(COMBAT_PATH)
  redirect(`${COMBAT_PATH}?campaign=${campaignId}`)
}
