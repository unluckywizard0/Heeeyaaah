'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RuleLink } from '@/components/rules/rule-link'
import { Input } from '@/components/ui/input'
import type { Edition } from '@/lib/types/dnd'

interface SpellListItem {
  id: string
  name: string
  source: string
  edition: Edition
  level: number | null
  school: string | null
  classes: string[]
}

const LEVEL_LABELS: Record<number, string> = {
  0: 'Cantrip',
  1: '1st',
  2: '2nd',
  3: '3rd',
  4: '4th',
  5: '5th',
  6: '6th',
  7: '7th',
  8: '8th',
  9: '9th',
}

export function SpellBrowser() {
  const [spells, setSpells] = useState<SpellListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [search, setSearch] = useState('')
  const [edition, setEdition] = useState<Edition | 'all'>('2024')
  const [level, setLevel] = useState<string>('all')
  const [school, setSchool] = useState<string>('all')
  const [klass, setKlass] = useState<string>('all')

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    Promise.resolve(
      supabase
        .from('rules_spells')
        .select('id, name, source, edition, level, school, classes')
        .order('name')
    ).then(({ data, error: err }) => {
      if (cancelled) return
      if (err) {
        setError(true)
      } else {
        setSpells((data ?? []) as SpellListItem[])
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const schools = useMemo(
    () => [...new Set(spells.map((s) => s.school).filter((s): s is string => !!s))].sort(),
    [spells]
  )
  const classes = useMemo(
    () => [...new Set(spells.flatMap((s) => s.classes ?? []))].sort(),
    [spells]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return spells.filter((s) => {
      if (edition !== 'all' && s.edition !== edition) return false
      if (level !== 'all' && String(s.level ?? '') !== level) return false
      if (school !== 'all' && s.school !== school) return false
      if (klass !== 'all' && !(s.classes ?? []).includes(klass)) return false
      if (q && !s.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [spells, search, edition, level, school, klass])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search spells…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
          aria-label="Search spells"
        />
        <Select label="Edition" value={edition} onChange={(v) => setEdition(v as Edition | 'all')}>
          <option value="2024">2024</option>
          <option value="2014">2014</option>
          <option value="all">All</option>
        </Select>
        <Select label="Level" value={level} onChange={setLevel}>
          <option value="all">Any level</option>
          {Object.entries(LEVEL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select label="School" value={school} onChange={setSchool}>
          <option value="all">Any school</option>
          {schools.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select label="Class" value={klass} onChange={setKlass}>
          <option value="all">Any class</option>
          {classes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      {loading && (
        <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
          Loading spells…
        </p>
      )}
      {error && (
        <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
          Couldn&apos;t load spells. Has the 5e.tools sync run yet?
        </p>
      )}
      {!loading && !error && (
        <>
          <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
            {filtered.length} spell{filtered.length === 1 ? '' : 's'}
          </p>
          <ul role="list" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((spell) => (
              <li
                key={spell.id}
                className="rounded-lg border p-3"
                style={{ borderColor: 'var(--border)', background: 'var(--background-surface)' }}
              >
                <RuleLink type="spell" name={spell.name} />
                <p className="mt-1 text-xs" style={{ color: 'var(--foreground-muted)' }}>
                  {spell.level != null ? LEVEL_LABELS[spell.level] ?? `Level ${spell.level}` : ''}
                  {spell.school ? ` ${spell.school}` : ''}
                </p>
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
