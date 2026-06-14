'use client'

import { useActionState } from 'react'
import { createEncounterAction, type ActionState } from '@/lib/actions/combat'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initialState: ActionState = {}

export function NewEncounterForm({ campaignId }: { campaignId: string }) {
  const [state, formAction, pending] = useActionState(createEncounterAction, initialState)

  return (
    <div
      className="rounded-lg border p-5"
      style={{ borderColor: 'var(--border)', background: 'var(--background-surface)' }}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--foreground-muted)' }}>
        No encounter yet
      </h2>
      <p className="mt-2 text-sm" style={{ color: 'var(--foreground-muted)' }}>
        Set up the roster, then roll initiative to begin.
      </p>

      <form action={formAction} className="mt-4 flex items-end gap-3">
        <input type="hidden" name="campaign_id" value={campaignId} />
        <div className="flex-1 space-y-2">
          <Label htmlFor="encounter-name">Encounter name</Label>
          <Input
            id="encounter-name"
            name="name"
            placeholder="Ambush on the bridge"
            defaultValue="Encounter"
            disabled={pending}
          />
        </div>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? 'Creating…' : 'New encounter'}
        </Button>
      </form>

      {state.error && (
        <p role="alert" className="mt-3 text-sm flex items-center gap-1" style={{ color: '#e74c3c' }}>
          <span aria-hidden="true">⚠</span>
          {state.error}
        </p>
      )}
    </div>
  )
}
