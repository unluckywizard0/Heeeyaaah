'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { NoteVisibility } from '@/lib/types/dnd'

export interface ActionState {
  error?: string
}

const NOTES_PATH = '/app/notes'

function parseVisibility(raw: unknown): NoteVisibility {
  return raw === 'shared' ? 'shared' : 'dm_only'
}

/** Create a session note. Only the campaign's DM may do this (enforced by RLS). */
export async function createNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const campaignId = String(formData.get('campaign_id') ?? '')
  const title = String(formData.get('title') ?? '').trim() || 'Untitled'
  const body = String(formData.get('body') ?? '')
  const visibility = parseVisibility(formData.get('visibility'))
  const sessionDate = String(formData.get('session_date') ?? '').trim() || null

  if (!campaignId) return { error: 'Missing campaign.' }
  if (title.length > 200) return { error: 'Title is too long (200 chars max).' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.from('session_notes').insert({
    campaign_id: campaignId,
    author_id: user.id,
    title,
    body,
    visibility,
    session_date: sessionDate,
  })

  if (error) return { error: error.message }

  revalidatePath(NOTES_PATH)
  return {}
}

/** Update an existing note's content/visibility. DM-only via RLS. */
export async function updateNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get('id') ?? '')
  const title = String(formData.get('title') ?? '').trim() || 'Untitled'
  const body = String(formData.get('body') ?? '')
  const visibility = parseVisibility(formData.get('visibility'))
  const sessionDate = String(formData.get('session_date') ?? '').trim() || null

  if (!id) return { error: 'Missing note.' }
  if (title.length > 200) return { error: 'Title is too long (200 chars max).' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('session_notes')
    .update({ title, body, visibility, session_date: sessionDate })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(NOTES_PATH)
  return {}
}

export async function deleteNoteAction(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('session_notes').delete().eq('id', id)
  revalidatePath(NOTES_PATH)
}
