'use client'

import { useActionState } from 'react'
import { createCampaignAction, type ActionState } from '@/lib/actions/campaigns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initialState: ActionState = {}

export function CreateCampaignForm() {
  const [state, formAction, pending] = useActionState(createCampaignAction, initialState)

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="campaign-name">Campaign name</Label>
        <Input
          id="campaign-name"
          name="name"
          required
          maxLength={120}
          placeholder="Curse of Strahd"
          disabled={pending}
          aria-invalid={!!state.error}
          aria-describedby={state.error ? 'create-campaign-error' : undefined}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          Rules edition
        </legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--foreground)' }}>
            <input type="radio" name="edition" value="2024" defaultChecked disabled={pending} />
            2024
          </label>
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--foreground)' }}>
            <input type="radio" name="edition" value="2014" disabled={pending} />
            2014
          </label>
        </div>
      </fieldset>

      {state.error && (
        <p
          id="create-campaign-error"
          role="alert"
          className="text-sm flex items-center gap-1"
          style={{ color: '#e74c3c' }}
        >
          <span aria-hidden="true">⚠</span>
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? 'Creating…' : 'Create campaign'}
      </Button>
    </form>
  )
}
