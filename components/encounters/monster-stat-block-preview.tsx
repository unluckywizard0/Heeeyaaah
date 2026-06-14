'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  extractStatBlock,
  abilityModifier,
  formatModifier,
  type MonsterStatBlock,
} from '@/lib/encounter/monster-stat-block'

/**
 * Inline stat-block preview for a searched monster (KAN-24). The `data` jsonb is
 * heavy, so it's fetched only when the row is expanded, keyed by monster id.
 */
export function MonsterStatBlockPreview({ monsterId }: { monsterId: string }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [block, setBlock] = useState<MonsterStatBlock | null>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    setState('loading')
    Promise.resolve(supabase.from('rules_monsters').select('data').eq('id', monsterId).maybeSingle())
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data) {
          setState('error')
          return
        }
        setBlock(extractStatBlock((data as { data: unknown }).data))
        setState('ready')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [monsterId])

  if (state === 'loading') {
    return (
      <p className="mt-3 text-xs" style={{ color: 'var(--foreground-muted)' }}>
        Loading stat block…
      </p>
    )
  }
  if (state === 'error' || !block) {
    return (
      <p className="mt-3 text-xs" style={{ color: 'var(--foreground-muted)' }}>
        Couldn&apos;t load this stat block.
      </p>
    )
  }

  return (
    <div
      className="mt-3 space-y-2 rounded-lg border p-3 text-xs"
      style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
    >
      <p style={{ color: 'var(--foreground-muted)' }}>
        {block.size} {block.typeText}
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
        <Stat label="AC" value={block.acText} />
        <Stat label="HP" value={block.hpText} />
        <Stat label="Speed" value={block.speed} />
      </dl>
      <div className="grid grid-cols-6 gap-1 text-center">
        {block.abilities.map((a) => (
          <div key={a.key} className="rounded border py-1" style={{ borderColor: 'var(--border)' }}>
            <p className="font-semibold" style={{ color: 'var(--foreground-muted)' }}>
              {a.label}
            </p>
            <p>
              {a.score ?? '—'}
              {a.score != null && (
                <span className="ml-0.5" style={{ color: 'var(--foreground-muted)' }}>
                  ({formatModifier(abilityModifier(a.score))})
                </span>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1">
      <dt className="font-semibold" style={{ color: 'var(--foreground-muted)' }}>
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  )
}
