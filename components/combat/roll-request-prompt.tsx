'use client'

import { useEffect, useRef, useState } from 'react'
import { useDiceRoller } from '@/hooks/use-dice-roller'
import { toRollResult } from '@/lib/dice/roll-history'
import { recordRollAction } from '@/lib/actions/rolls'
import type { RollRequest } from '@/lib/types/dnd'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Player-facing prompt for a single open roll request (KAN-49). The player adds
 * their modifier and rolls a d20; the result is logged to roll_history tagged
 * with the request so it lands in the DM's panel live.
 */
export function RollRequestPrompt({ request }: { request: RollRequest }) {
  const { lastResult, status, rollNormal } = useDiceRoller()
  const [modifier, setModifier] = useState(0)
  const pending = useRef(false)

  useEffect(() => {
    if (!pending.current || status !== 'ready' || !lastResult) return
    pending.current = false
    const sign = modifier >= 0 ? '+' : ''
    void recordRollAction(
      request.campaign_id,
      `1d20${modifier ? `${sign}${modifier}` : ''}`,
      toRollResult(lastResult),
      request.label,
      false,
      request.id,
    )
  }, [lastResult, status, modifier, request])

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-lg border p-3"
      style={{ borderColor: 'var(--border)' }}
      onSubmit={(e) => {
        e.preventDefault()
        pending.current = true
        const sign = modifier >= 0 ? '+' : ''
        void rollNormal(`1d20${modifier ? `${sign}${modifier}` : ''}`)
      }}
    >
      <p className="pb-1.5 text-sm font-medium" style={{ color: 'var(--foreground)' }}>
        {request.label}
      </p>
      <div className="space-y-1">
        <Label htmlFor={`mod-${request.id}`}>Modifier</Label>
        <Input
          id={`mod-${request.id}`}
          type="number"
          value={modifier}
          onChange={(e) => setModifier(Number(e.target.value) || 0)}
          className="w-20"
        />
      </div>
      <Button type="submit" disabled={status === 'rolling'}>
        {status === 'rolling' ? 'Rolling…' : 'Roll d20'}
      </Button>
    </form>
  )
}
