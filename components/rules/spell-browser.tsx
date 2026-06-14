'use client'

import { RuleBrowser, type RuleBrowserFilter } from '@/components/rules/rule-browser'
import type { Edition } from '@/lib/types/dnd'

interface SpellListItem {
  id: string
  name: string
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

const levelLabel = (level: number | null): string =>
  level == null ? '' : LEVEL_LABELS[level] ?? `Level ${level}`

const filters: RuleBrowserFilter<SpellListItem>[] = [
  {
    key: 'edition',
    label: 'Edition',
    options: () => ['2024', '2014'],
    match: (row, value) => row.edition === value,
    defaultValue: '2024',
  },
  {
    key: 'level',
    label: 'Level',
    // Ordered Cantrip → 9th, restricted to levels actually present.
    options: (rows) => {
      const present = new Set(rows.map((r) => r.level))
      return Object.keys(LEVEL_LABELS)
        .map(Number)
        .filter((lvl) => present.has(lvl))
        .map((lvl) => LEVEL_LABELS[lvl])
    },
    match: (row, value) => levelLabel(row.level) === value,
  },
  {
    key: 'school',
    label: 'School',
    options: (rows) =>
      [...new Set(rows.map((r) => r.school).filter((s): s is string => !!s))].sort(),
    match: (row, value) => row.school === value,
  },
  {
    key: 'class',
    label: 'Class',
    options: (rows) => [...new Set(rows.flatMap((r) => r.classes ?? []))].sort(),
    match: (row, value) => (row.classes ?? []).includes(value),
  },
]

export function SpellBrowser() {
  return (
    <RuleBrowser<SpellListItem>
      table="rules_spells"
      select="id, name, edition, level, school, classes"
      ruleType="spell"
      filters={filters}
      meta={(row) => [levelLabel(row.level), row.school].filter(Boolean).join(' ')}
      noun="spells"
    />
  )
}
