'use client'

import { useActionState } from 'react'
import { joinCampaignAction, type ActionState } from '@/lib/actions/campaigns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initialState: ActionState = {}

export function JoinCampaignForm() {
  const [state, formAction, pending] = useActionState(joinCampaignAction, initialState)

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="invite-code">Invite code</Label>
        <Input
          id="invite-code"
          name="code"
          required
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="ABCD2345"
          className="font-mono tracking-widest uppercase"
          disabled={pending}
          aria-invalid={!!state.error}
          aria-describedby={state.error ? 'join-campaign-error' : undefined}
        />
      </div>

      {state.error && (
        <p
          id="join-campaign-error"
          role="alert"
          className="text-sm flex items-center gap-1"
          style={{ color: '#e74c3c' }}
        >
          <span aria-hidden="true">⚠</span>
          {state.error}
        </p>
      )}

      <Button type="submit" variant="outline" disabled={pending} aria-busy={pending}>
        {pending ? 'Joining…' : 'Join campaign'}
      </Button>
    </form>
  )
}
