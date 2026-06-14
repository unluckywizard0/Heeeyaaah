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

const ENCOUNTERS_PATH = '/app/encounters'

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
