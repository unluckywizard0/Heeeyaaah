'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCr } from '@/lib/rules/format-cr'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MonsterStatBlockPreview } from '@/components/encounters/monster-stat-block-preview'
import type { Edition } from '@/lib/types/dnd'

interface MonsterRow {
  id: string
  name: string
  edition: Edition
  cr: number | null
  type: string | null
  source: string | null
}

const selectStyle = {
  borderColor: 'var(--border)',
  color: 'var(--foreground)',
}

/**
 * Search the bestiary (rules_monsters) and add a monster to the encounter with
 * a quantity (KAN-24). Loads the lightweight list once (no `data` blob) and
 * filters client-side; the full stat block is fetched lazily on preview.
 */
export function MonsterSearch({
  onAdd,
}: {
  onAdd: (monster: { name: string; cr: number; count: number }) => void
}) {
  const [rows, setRows] = useState<MonsterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [edition, setEdition] = useState('all')
  const [type, setType] = useState('all')
  const [source, setSource] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function loadAll() {
      const PAGE = 1000
      const all: MonsterRow[] = []
      for (let from = 0; ; from += PAGE) {
        const { data, error: err } = await supabase
          .from('rules_monsters')
          .select('id, name, edition, cr, type, source')
          .order('name')
          .range(from, from + PAGE - 1)
        if (err) {
          if (!cancelled) setError(true)
          break
        }
        all.push(...((data ?? []) as unknown as MonsterRow[]))
        if (!data || data.length < PAGE) {
          if (!cancelled) setRows(all)
          break
        }
      }
      if (!cancelled) setLoading(false)
    }

    loadAll()
    return () => {
      cancelled = true
    }
  }, [])

  const types = useMemo(
    () => [...new Set(rows.map((r) => r.type).filter((t): t is string => !!t))].sort(),
    [rows],
  )
  const sources = useMemo(
    () => [...new Set(rows.map((r) => r.source).filter((s): s is string => !!s))].sort(),
    [rows],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (q && !row.name.toLowerCase().includes(q)) return false
      if (edition !== 'all' && row.edition !== edition) return false
      if (type !== 'all' && row.type !== type) return false
      if (source !== 'all' && row.source !== source) return false
      return true
    })
  }, [rows, search, edition, type, source])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search monsters…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-[12rem]"
          aria-label="Search monsters"
        />
        <Filter label="Edition" value={edition} onChange={setEdition} options={['2024', '2014']} />
        <Filter label="Type" value={type} onChange={setType} options={types} />
        <Filter label="Source" value={source} onChange={setSource} options={sources} />
      </div>

      {loading && (
        <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
          Loading bestiary…
        </p>
      )}
      {error && (
        <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
          Couldn&apos;t load monsters. Has the 5e.tools sync run yet?
        </p>
      )}

      {!loading && !error && (
        <>
          <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
            {filtered.length} monsters
          </p>
          <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {filtered.slice(0, 100).map((row) => (
              <li
                key={row.id}
                className="rounded-lg border p-3"
                style={{ borderColor: 'var(--border)', background: 'var(--background-surface)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                      {row.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                      CR {formatCr(row.cr)}
                      {row.type ? ` • ${row.type}` : ''}
                      {row.source ? ` • ${row.source}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpanded((id) => (id === row.id ? null : row.id))}
                      aria-expanded={expanded === row.id}
                    >
                      {expanded === row.id ? 'Hide' : 'Stats'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={row.cr == null}
                      onClick={() => row.cr != null && onAdd({ name: row.name, cr: row.cr, count: 1 })}
                    >
                      + Add
                    </Button>
                  </div>
                </div>
                {expanded === row.id && <MonsterStatBlockPreview monsterId={row.id} />}
              </li>
            ))}
          </ul>
          {filtered.length > 100 && (
            <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
              Showing the first 100 — narrow your search to see more.
            </p>
          )}
        </>
      )}
    </div>
  )
}

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
}) {
  return (
    <label className="flex items-center gap-1 text-xs" style={{ color: 'var(--foreground-muted)' }}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-lg border bg-transparent px-2 text-sm outline-none"
        style={selectStyle}
      >
        <option value="all">Any</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  )
}
