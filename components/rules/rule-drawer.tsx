'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/import/normalize'
import { flattenEntries } from '@/lib/rules/format-entries'
import { RULE_TABLES, type RuleType } from '@/lib/rules/rule-tables'

interface RuleDrawerProps {
  type: RuleType
  name: string
  onClose: () => void
}

interface RuleData {
  name: string
  meta: string[]
  paragraphs: string[]
}

export function RuleDrawer({ type, name, onClose }: RuleDrawerProps) {
  const [state, setState] = useState<'loading' | 'found' | 'not-found' | 'error'>('loading')
  const [data, setData] = useState<RuleData | null>(null)

  useEffect(() => {
    let cancelled = false
    const table = RULE_TABLES[type]
    if (!table) {
      setState('not-found')
      return
    }

    setState('loading')
    const supabase = createClient()
    Promise.resolve(
      supabase.from(table).select('*').eq('slug', slugify(name)).limit(1).maybeSingle()
    )
      .then(({ data: row, error }) => {
        if (cancelled) return
        if (error || !row) {
          setState('not-found')
          return
        }
        setData({
          name: row.name as string,
          meta: buildMeta(type, row as Record<string, unknown>),
          paragraphs: flattenEntries((row.data as Record<string, unknown>)?.entries),
        })
        setState('found')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })

    return () => {
      cancelled = true
    }
  }, [type, name])

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <button
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative h-full w-full max-w-md overflow-y-auto border-l p-6"
        style={{ background: 'var(--background-surface)', borderColor: 'var(--border)' }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-sm"
          style={{ color: 'var(--foreground-muted)' }}
          aria-label="Close"
        >
          ✕
        </button>

        <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--accent-gold)' }}>
          {type}
        </p>
        <h2 className="mt-1 text-lg font-bold" style={{ color: 'var(--foreground)' }}>
          {data?.name ?? name}
        </h2>

        {state === 'loading' && (
          <p className="mt-4 text-sm" style={{ color: 'var(--foreground-muted)' }}>
            Loading…
          </p>
        )}

        {(state === 'not-found' || state === 'error') && (
          <p className="mt-4 text-sm" style={{ color: 'var(--foreground-muted)' }}>
            No reference entry found for &ldquo;{name}&rdquo;.
          </p>
        )}

        {state === 'found' && data && (
          <div className="mt-4 space-y-3 text-sm" style={{ color: 'var(--foreground)' }}>
            {data.meta.length > 0 && (
              <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                {data.meta.join(' • ')}
              </p>
            )}
            {data.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function buildMeta(type: RuleType, row: Record<string, unknown>): string[] {
  const meta: string[] = []
  if (row.source) meta.push(String(row.source))
  if (row.edition) meta.push(row.edition === '2024' ? '2024 rules' : '2014 rules')
  switch (type) {
    case 'spell':
      if (row.level != null) meta.unshift(row.level === 0 ? 'Cantrip' : `Level ${row.level}`)
      if (row.school) meta.push(String(row.school))
      break
    case 'monster':
      if (row.cr != null) meta.unshift(`CR ${row.cr}`)
      if (row.type) meta.push(String(row.type))
      break
    case 'item':
      if (row.rarity) meta.unshift(String(row.rarity))
      if (row.item_type) meta.push(String(row.item_type))
      break
  }
  return meta
}
