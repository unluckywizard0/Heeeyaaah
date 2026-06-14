'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { RollResult } from '@/lib/types/dnd'

/**
 * Log a dice roll to the campaign's shared roll history (KAN-16). RLS enforces
 * that the inserted `user_id` matches the caller and that they're a member of
 * `campaignId`.
 */
export async function recordRollAction(
  campaignId: string,
  expression: string,
  results: RollResult,
  context: string,
  isPrivate: boolean,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  const { error } = await supabase.from('roll_history').insert({
    campaign_id: campaignId,
    user_id: user.id,
    expression,
    results,
    context,
    is_private: isPrivate,
  })

  if (error) return { error: error.message }

  revalidatePath('/app/combat')
  return {}
}
