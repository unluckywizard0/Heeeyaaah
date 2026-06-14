'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useDiceRoller } from '@/hooks/use-dice-roller'
import { toRollResult } from '@/lib/dice/roll-history'
import { recordRollAction } from '@/lib/actions/rolls'
import { extractStatBlock, formatModifier, type MonsterAction } from '@/lib/encounter/monster-stat-block'
import { Button } from '@/components/ui/button'

/**
 * KAN-47 — clickable attack/damage rolls for a combatant linked to a bestiary
 * entry. Lazily fetches the monster's `data` blob, extracts its actions, and
 * rolls + logs to the campaign roll history via the shared dice store.
 */
export function MonsterActionsPanel({
  campaignId,
  creatureName,
  monsterId,
}: {
  campaignId: string
  creatureName: string
  monsterId: string
}) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [actions, setActions] = useState<MonsterAction[]>([])
  const { lastResult, status, rollNormal } = useDiceRoller()
  const pending = useRef<{ notation: string; context: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    Promise.resolve(supabase.from('rules_monsters').select('data').eq('id', monsterId).maybeSingle())
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data) {
          setState('error')
          return
        }
        setActions(extractStatBlock((data as { data: unknown }).data).actions)
        setState('ready')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [monsterId])

  useEffect(() => {
    if (!pending.current || status !== 'ready' || !lastResult) return
    const { notation, context } = pending.current
    pending.current = null
    void recordRollAction(campaignId, notation, toRollResult(lastResult), context, false)
  }, [lastResult, status, campaignId])

  function roll(notation: string, context: string) {
    pending.current = { notation, context }
    void rollNormal(notation)
  }

  if (state === 'loading') {
    return (
      <p className="mt-2 text-xs" style={{ color: 'var(--foreground-muted)' }}>
        Loading actions…
      </p>
    )
  }
  if (state === 'error' || actions.length === 0) {
    return (
      <p className="mt-2 text-xs" style={{ color: 'var(--foreground-muted)' }}>
        No rollable actions for this monster.
      </p>
    )
  }

  return (
    <ul className="mt-2 space-y-1.5">
      {actions.map((action) => {
        const attackNotation =
          action.attackBonus == null
            ? null
            : `1d20${action.attackBonus >= 0 ? '+' : ''}${action.attackBonus}`
        const damageNotation = action.damageDice.length > 0 ? action.damageDice.join('+') : null

        return (
          <li key={action.name} className="text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                {action.name}
              </span>
              {attackNotation && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={status === 'rolling'}
                  onClick={() => roll(attackNotation, `${creatureName}: ${action.name} attack`)}
                >
                  Attack {formatModifier(action.attackBonus!)}
                </Button>
              )}
              {damageNotation && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={status === 'rolling'}
                  onClick={() => roll(damageNotation, `${creatureName}: ${action.name} damage`)}
                >
                  Damage {action.damageDice.join(' + ')}
                </Button>
              )}
            </div>
            <p style={{ color: 'var(--foreground-muted)' }}>{action.text}</p>
          </li>
        )
      })}
    </ul>
  )
}
