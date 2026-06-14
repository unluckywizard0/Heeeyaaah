'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCr } from '@/lib/rules/format-cr'
import { addMonsterCombatantAction } from '@/lib/actions/combat'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface MonsterRow {
  id: string
  name: string
  cr: number | null
  type: string | null
}

/**
 * Add a combatant straight from the bestiary (KAN-47). Linking `monster_id`
 * lets the tracker pull AC/HP/DEX and surface rollable attacks/damage.
 */
export function AddMonsterCombatant({ encounterId }: { encounterId: string }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<MonsterRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState<string | null>(null)

  useEffect(() => {
    if (!open || rows.length > 0) return
    let cancelled = false
    const supabase = createClient()
    setLoading(true)

    async function loadAll() {
      const PAGE = 1000
      const all: MonsterRow[] = []
      for (let from = 0; ; from += PAGE) {
        const { data, error: err } = await supabase
          .from('rules_monsters')
          .select('id, name, cr, type')
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
  }, [open, rows.length])

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        + Add from bestiary
      </Button>
    )
  }

  const q = search.trim().toLowerCase()
  const filtered = q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search bestiary…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-[12rem]"
          aria-label="Search bestiary"
        />
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Close
        </Button>
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
        <ul className="max-h-60 space-y-1 overflow-y-auto pr-1">
          {filtered.slice(0, 50).map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-2 rounded-lg border p-2"
              style={{ borderColor: 'var(--border)', background: 'var(--background-surface)' }}
            >
              <span className="text-sm" style={{ color: 'var(--foreground)' }}>
                {row.name}{' '}
                <span style={{ color: 'var(--foreground-muted)' }}>
                  (CR {formatCr(row.cr)}{row.type ? ` ${row.type}` : ''})
                </span>
              </span>
              <Button
                type="button"
                size="sm"
                disabled={adding === row.id}
                onClick={async () => {
                  setAdding(row.id)
                  await addMonsterCombatantAction(encounterId, row.id)
                  setAdding(null)
                }}
              >
                {adding === row.id ? 'Adding…' : '+ Add'}
              </Button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
              No matches.
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
