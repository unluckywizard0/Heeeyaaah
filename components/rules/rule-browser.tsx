'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RuleLink } from '@/components/rules/rule-link'
import { Input } from '@/components/ui/input'
import type { RuleType } from '@/lib/rules/rule-tables'

export interface RuleBrowserFilter<T> {
  key: string
  label: string
  /** Distinct option values, derived from the loaded rows. */
  options: (rows: T[]) => string[]
  /** Whether a row matches the selected option value. */
  match: (row: T, value: string) => boolean
}

interface RuleBrowserProps<T extends { id: string; name: string }> {
  table: string
  select: string
  ruleType: RuleType
  filters: RuleBrowserFilter<T>[]
  /** Secondary line under each entry's name, e.g. "CR 1/4 • beast". */
  meta?: (row: T) => string
  noun: string
}

// Generic searchable/filterable list over a rules_* table. Each entry renders
// as a RuleLink (KAN-28), which opens the full entry in a drawer on click.
export function RuleBrowser<T extends { id: string; name: string }>({
  table,
  select,
  ruleType,
  filters,
  meta,
  noun,
}: RuleBrowserProps<T>) {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    Promise.resolve(supabase.from(table).select(select).order('name')).then(
      ({ data, error: err }) => {
        if (cancelled) return
        if (err) setError(true)
        else setRows((data ?? []) as unknown as T[])
        setLoading(false)
      }
    )
    return () => {
      cancelled = true
    }
  }, [table, select])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (q && !row.name.toLowerCase().includes(q)) return false
      for (const f of filters) {
        const value = selected[f.key] ?? 'all'
        if (value !== 'all' && !f.match(row, value)) return false
      }
      return true
    })
  }, [rows, search, selected, filters])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder={`Search ${noun}…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
          aria-label={`Search ${noun}`}
        />
        {filters.map((f) => (
          <Select
            key={f.key}
            label={f.label}
            value={selected[f.key] ?? 'all'}
            onChange={(v) => setSelected((s) => ({ ...s, [f.key]: v }))}
          >
            <option value="all">Any {f.label.toLowerCase()}</option>
            {f.options(rows).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Select>
        ))}
      </div>

      {loading && (
        <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
          Loading {noun}…
        </p>
      )}
      {error && (
        <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
          Couldn&apos;t load {noun}. Has the 5e.tools sync run yet?
        </p>
      )}
      {!loading && !error && (
        <>
          <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
            {filtered.length} {noun}
          </p>
          <ul role="list" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border p-3"
                style={{ borderColor: 'var(--border)', background: 'var(--background-surface)' }}
              >
                <RuleLink type={ruleType} name={row.name} />
                {meta && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--foreground-muted)' }}>
                    {meta(row)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--foreground-muted)' }}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none"
        style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
      >
        {children}
      </select>
    </label>
  )
}
