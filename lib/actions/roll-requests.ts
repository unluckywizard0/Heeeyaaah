'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { rollRequestLabel, type CheckKind } from '@/lib/dnd/roll-requests'

const COMBAT_PATH = '/app/combat'

export interface RollRequestActionState {
  error?: string
}

function parseKind(raw: unknown): CheckKind {
  return raw === 'save' ? 'save' : 'check'
}

/**
 * The DM asks one player or the whole party for a check or save (KAN-49).
 * RLS enforces DM-only insert; we just assemble the row + label.
 */
export async function createRollRequestAction(
  _prev: RollRequestActionState,
  formData: FormData,
): Promise<RollRequestActionState> {
  const campaignId = String(formData.get('campaign_id') ?? '')
  const kind = parseKind(formData.get('kind'))
  const subjectLabel = String(formData.get('subject_label') ?? '').trim()
  const dcRaw = String(formData.get('dc') ?? '').trim()
  const targetRaw = String(formData.get('target_user_id') ?? '').trim()

  if (!campaignId) return { error: 'Missing campaign.' }
  if (!subjectLabel) return { error: 'Pick an ability or skill to ask for.' }

  let dc: number | null = null
  if (dcRaw) {
    const parsed = Number(dcRaw)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 40) {
      return { error: 'DC must be a whole number between 1 and 40.' }
    }
    dc = parsed
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  const { error } = await supabase.from('roll_requests').insert({
    campaign_id: campaignId,
    requested_by: user.id,
    label: rollRequestLabel(kind, subjectLabel, dc),
    kind,
    dc,
    target_user_id: targetRaw || null,
  })

  if (error) return { error: error.message }

  revalidatePath(COMBAT_PATH)
  return {}
}

/** Close a request so no more responses are expected. DM-only via RLS. */
export async function closeRollRequestAction(requestId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('roll_requests').update({ is_open: false }).eq('id', requestId)
  revalidatePath(COMBAT_PATH)
}
