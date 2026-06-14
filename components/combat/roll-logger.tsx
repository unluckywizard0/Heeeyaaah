'use client'

import { useEffect, useRef, useState } from 'react'
import { useDiceRoller } from '@/hooks/use-dice-roller'
import { validateNotation } from '@/lib/dice/notation'
import { toRollResult } from '@/lib/dice/roll-history'
import { recordRollAction } from '@/lib/actions/rolls'
import { Button } from '@/components/ui/button'

/**
 * Roll dice notation and log the result to the campaign's roll history
 * (KAN-16). Reuses the global dice store, so a roll made here also shows in
 * the existing dice tray; once it resolves, it's saved via recordRollAction.
 */
export function RollLogger({ campaignId }: { campaignId: string }) {
  const { lastResult, status, error, rollNormal } = useDiceRoller()
  const [notation, setNotation] = useState('1d20')
  const [context, setContext] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const pending = useRef(false)

  useEffect(() => {
    if (!pending.current || status !== 'ready' || !lastResult) return
    pending.current = false
    void recordRollAction(campaignId, notation, toRollResult(lastResult), context, isPrivate)
  }, [lastResult, status, campaignId, notation, context, isPrivate])

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const { valid, error: validationError } = validateNotation(notation)
        if (!valid) {
          setFormError(validationError ?? 'Invalid notation')
          return
        }
        setFormError(null)
        pending.current = true
        void rollNormal(notation)
      }}
    >
      <input
        type="text"
        value={notation}
        onChange={(e) => setNotation(e.target.value)}
        placeholder="1d20+3"
        aria-label="Dice notation"
        className="w-24 rounded border px-2 py-1 text-sm"
        style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
      />
      <input
        type="text"
        value={context}
        onChange={(e) => setContext(e.target.value)}
        placeholder="Context (optional)"
        aria-label="Roll context"
        className="w-40 rounded border px-2 py-1 text-sm"
        style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
      />
      <label className="flex items-center gap-1 text-xs" style={{ color: 'var(--foreground-muted)' }}>
        <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
        Private
      </label>
      <Button type="submit" disabled={status === 'rolling'}>
        Roll
      </Button>
      {(formError ?? error) && (
        <span role="alert" className="text-xs" style={{ color: '#e74c3c' }}>
          {formError ?? error}
        </span>
      )}
    </form>
  )
}
