'use client'

import { useState } from 'react'
import type { SessionNote } from '@/lib/types/dnd'
import { deleteNoteAction } from '@/lib/actions/notes'
import { Button } from '@/components/ui/button'
import { NoteEditor } from '@/components/notes/note-editor'

export function NotesBoard({
  campaignId,
  notes,
  isDm,
}: {
  campaignId: string
  notes: SessionNote[]
  isDm: boolean
}) {
  const [creating, setCreating] = useState(false)

  return (
    <div className="space-y-5">
      {isDm && (
        <div>
          {creating ? (
            <NoteEditor campaignId={campaignId} onDone={() => setCreating(false)} />
          ) : (
            <Button type="button" onClick={() => setCreating(true)}>
              + New note
            </Button>
          )}
        </div>
      )}

      {notes.length === 0 ? (
        <p
          className="rounded-lg border border-dashed p-6 text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--foreground-muted)' }}
        >
          {isDm
            ? 'No notes yet. Add one above to start your session log.'
            : 'No shared notes yet. Your DM hasn’t posted anything for the party.'}
        </p>
      ) : (
        <ul role="list" className="space-y-3">
          {notes.map((note) => (
            <li key={note.id}>
              <NoteCard note={note} isDm={isDm} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function NoteCard({ note, isDm }: { note: SessionNote; isDm: boolean }) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return <NoteEditor note={note} onDone={() => setEditing(false)} />
  }

  return (
    <article
      className="rounded-lg border p-4"
      style={{ borderColor: 'var(--border)', background: 'var(--background-surface)' }}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold" style={{ color: 'var(--foreground)' }}>
            {note.title}
          </h3>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--foreground-muted)' }}>
            {note.session_date ? formatDate(note.session_date) : 'No date'}
            {' · '}
            <VisibilityBadge visibility={note.visibility} />
          </p>
        </div>
        {isDm && (
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <form action={async () => { await deleteNoteAction(note.id) }}>
              <Button type="submit" variant="ghost" size="sm" aria-label={`Delete ${note.title}`}>
                ✕
              </Button>
            </form>
          </div>
        )}
      </header>

      {note.body.trim() && (
        <p className="mt-3 whitespace-pre-wrap text-sm" style={{ color: 'var(--foreground)' }}>
          {note.body}
        </p>
      )}
    </article>
  )
}

function VisibilityBadge({ visibility }: { visibility: SessionNote['visibility'] }) {
  const shared = visibility === 'shared'
  return (
    <span style={{ color: shared ? 'var(--accent-gold)' : 'var(--foreground-muted)' }}>
      {shared ? 'Shared with party' : 'DM only'}
    </span>
  )
}

function formatDate(iso: string): string {
  // iso is a plain YYYY-MM-DD date; render it without timezone drift.
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
