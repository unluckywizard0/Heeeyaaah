'use client'

import { useActionState } from 'react'
import type { SessionNote } from '@/lib/types/dnd'
import { createNoteAction, updateNoteAction, type ActionState } from '@/lib/actions/notes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initialState: ActionState = {}

const textareaStyle = {
  borderColor: 'var(--border)',
  color: 'var(--foreground)',
  background: 'transparent',
} as const

/**
 * Create or edit a session note. Pass `note` to edit; omit it to create.
 * `onDone` lets the parent collapse the editor after a successful submit.
 */
export function NoteEditor({
  campaignId,
  note,
  onDone,
}: {
  campaignId?: string
  note?: SessionNote
  onDone?: () => void
}) {
  const editing = !!note
  const action = editing ? updateNoteAction : createNoteAction
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await action(prev, formData)
      if (!result.error) onDone?.()
      return result
    },
    initialState,
  )

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-lg border p-4"
      style={{ borderColor: 'var(--border)', background: 'var(--background-surface)' }}
    >
      {editing ? (
        <input type="hidden" name="id" value={note.id} />
      ) : (
        <input type="hidden" name="campaign_id" value={campaignId} />
      )}

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 space-y-1.5" style={{ minWidth: '14rem' }}>
          <Label htmlFor={`note-title-${note?.id ?? 'new'}`}>Title</Label>
          <Input
            id={`note-title-${note?.id ?? 'new'}`}
            name="title"
            defaultValue={note?.title ?? ''}
            maxLength={200}
            placeholder="Session 12 — The Sunless Citadel"
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`note-date-${note?.id ?? 'new'}`}>Session date</Label>
          <Input
            id={`note-date-${note?.id ?? 'new'}`}
            name="session_date"
            type="date"
            defaultValue={note?.session_date ?? ''}
            disabled={pending}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`note-body-${note?.id ?? 'new'}`}>Notes</Label>
        <textarea
          id={`note-body-${note?.id ?? 'new'}`}
          name="body"
          defaultValue={note?.body ?? ''}
          rows={5}
          placeholder="What happened, NPCs met, loose threads…"
          disabled={pending}
          className="w-full rounded-lg border px-2.5 py-2 text-sm outline-none focus-visible:border-ring"
          style={textareaStyle}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <fieldset className="flex gap-4">
          <legend className="sr-only">Visibility</legend>
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--foreground)' }}>
            <input
              type="radio"
              name="visibility"
              value="dm_only"
              defaultChecked={(note?.visibility ?? 'dm_only') === 'dm_only'}
              disabled={pending}
            />
            DM only
          </label>
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--foreground)' }}>
            <input
              type="radio"
              name="visibility"
              value="shared"
              defaultChecked={note?.visibility === 'shared'}
              disabled={pending}
            />
            Shared with party
          </label>
        </fieldset>

        <div className="flex gap-2">
          {editing && onDone && (
            <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending ? 'Saving…' : editing ? 'Save changes' : 'Add note'}
          </Button>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="text-sm flex items-center gap-1" style={{ color: '#e74c3c' }}>
          <span aria-hidden="true">⚠</span>
          {state.error}
        </p>
      )}
    </form>
  )
}
