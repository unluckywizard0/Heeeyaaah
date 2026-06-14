'use client'

import { useActionState, useState } from 'react'
import { createRollRequestAction, type RollRequestActionState } from '@/lib/actions/roll-requests'
import { ABILITIES, SKILLS, type CheckKind } from '@/lib/dnd/roll-requests'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initialState: RollRequestActionState = {}

export interface RequestTarget {
  userId: string
  name: string
}

const selectStyle = {
  borderColor: 'var(--border)',
  background: 'var(--background)',
  color: 'var(--foreground)',
}

/** DM control: ask one player or the whole party for a check or save (KAN-49). */
export function RollRequestForm({
  campaignId,
  targets,
}: {
  campaignId: string
  targets: RequestTarget[]
}) {
  const [state, formAction, pending] = useActionState(createRollRequestAction, initialState)
  const [kind, setKind] = useState<CheckKind>('check')

  const subjects = kind === 'save' ? ABILITIES : SKILLS

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="campaign_id" value={campaignId} />

      <div className="space-y-2">
        <Label htmlFor="request-kind">Type</Label>
        <select
          id="request-kind"
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as CheckKind)}
          disabled={pending}
          className="h-10 rounded-md border px-3 text-sm"
          style={selectStyle}
        >
          <option value="check">Skill check</option>
          <option value="save">Saving throw</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="request-subject">{kind === 'save' ? 'Ability' : 'Skill'}</Label>
        <select
          id="request-subject"
          name="subject_label"
          disabled={pending}
          className="h-10 rounded-md border px-3 text-sm"
          style={selectStyle}
        >
          {subjects.map((s) => (
            <option key={s.key} value={s.label}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="request-dc">DC (optional)</Label>
        <Input
          id="request-dc"
          name="dc"
          type="number"
          min={1}
          max={40}
          placeholder="—"
          disabled={pending}
          className="w-20"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="request-target">Who</Label>
        <select
          id="request-target"
          name="target_user_id"
          disabled={pending}
          className="h-10 rounded-md border px-3 text-sm"
          style={selectStyle}
        >
          <option value="">Whole party</option>
          {targets.map((t) => (
            <option key={t.userId} value={t.userId}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? 'Asking…' : 'Request roll'}
      </Button>

      {state.error && (
        <p role="alert" className="text-sm flex items-center gap-1" style={{ color: '#e74c3c' }}>
          <span aria-hidden="true">⚠</span>
          {state.error}
        </p>
      )}
    </form>
  )
}
