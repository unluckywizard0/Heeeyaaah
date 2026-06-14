'use client'

import { useState, useTransition } from 'react'
import type { EncounterTemplate } from '@/lib/types/dnd'
import type { PartyGroup, MonsterGroup } from '@/lib/encounter/difficulty'
import {
  saveEncounterTemplateAction,
  updateEncounterTemplateAction,
  deleteEncounterTemplateAction,
} from '@/lib/actions/encounter-templates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * DM-only save/load panel for the encounter calculator. Holds no encounter
 * state of its own — the calculator owns party/monsters and passes them in,
 * plus an onLoad callback so a chosen template can repopulate the calculator.
 */
export function TemplateManager({
  campaignId,
  templates,
  party,
  monsters,
  onLoad,
}: {
  campaignId: string
  templates: EncounterTemplate[]
  party: PartyGroup[]
  monsters: MonsterGroup[]
  onLoad: (party: PartyGroup[], monsters: MonsterGroup[]) => void
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function doSave() {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Name the template before saving.')
      return
    }
    startTransition(async () => {
      const result = await saveEncounterTemplateAction(campaignId, trimmed, party, monsters)
      setError(result.error ?? null)
      if (!result.error) setName('')
    })
  }

  return (
    <section
      className="rounded-lg border p-4 space-y-3"
      style={{ borderColor: 'var(--border)', background: 'var(--background-surface)' }}
      aria-label="Saved encounters"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--foreground-muted)' }}>
        Saved encounters
      </h2>

      {/* Save the current configuration */}
      <div className="flex items-end gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Template name"
          aria-label="New template name"
          disabled={pending}
          className="flex-1"
        />
        <Button type="button" onClick={doSave} disabled={pending} aria-busy={pending}>
          {pending ? 'Saving…' : 'Save current'}
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-sm flex items-center gap-1" style={{ color: '#e74c3c' }}>
          <span aria-hidden="true">⚠</span>
          {error}
        </p>
      )}

      {/* Load / overwrite / delete saved configurations */}
      {templates.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
          No saved encounters yet. Build a party and monster line-up, then save it for reuse.
        </p>
      ) : (
        <ul role="list" className="space-y-2">
          {templates.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-md p-2"
              style={{ background: 'var(--background)' }}
            >
              <div className="min-w-0">
                <p className="truncate font-medium" style={{ color: 'var(--foreground)' }}>
                  {t.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                  {t.party.reduce((n, g) => n + g.count, 0)} chars · {t.monsters.reduce((n, g) => n + g.count, 0)} monsters
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  disabled={pending}
                  onClick={() => onLoad(t.party, t.monsters)}
                >
                  Load
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  disabled={pending}
                  title="Overwrite with the current party and monsters"
                  onClick={() =>
                    startTransition(async () => {
                      const result = await updateEncounterTemplateAction(t.id, t.name, party, monsters)
                      setError(result.error ?? null)
                    })
                  }
                >
                  Overwrite
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  disabled={pending}
                  aria-label={`Delete ${t.name}`}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await deleteEncounterTemplateAction(t.id)
                      setError(result.error ?? null)
                    })
                  }
                >
                  ✕
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
