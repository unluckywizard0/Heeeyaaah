'use client'

import { RuleBrowser, type RuleBrowserFilter } from '@/components/rules/rule-browser'
import { formatCr } from '@/lib/rules/format-cr'
import type { Edition } from '@/lib/types/dnd'

interface MonsterListItem {
  id: string
  name: string
  edition: Edition
  cr: number | null
  type: string | null
}

const filters: RuleBrowserFilter<MonsterListItem>[] = [
  {
    key: 'edition',
    label: 'Edition',
    options: () => ['2024', '2014'],
    match: (row, value) => row.edition === value,
  },
  {
    key: 'cr',
    label: 'CR',
    options: (rows) =>
      [...new Set(rows.map((r) => r.cr).filter((cr): cr is number => cr != null))]
        .sort((a, b) => a - b)
        .map((cr) => formatCr(cr)),
    match: (row, value) => formatCr(row.cr) === value,
  },
  {
    key: 'type',
    label: 'Type',
    options: (rows) =>
      [...new Set(rows.map((r) => r.type).filter((t): t is string => !!t))].sort(),
    match: (row, value) => row.type === value,
  },
]

export function MonsterBrowser() {
  return (
    <RuleBrowser<MonsterListItem>
      table="rules_monsters"
      select="id, name, edition, cr, type"
      ruleType="monster"
      filters={filters}
      meta={(row) => `CR ${formatCr(row.cr)}${row.type ? ` • ${row.type}` : ''}`}
      noun="monsters"
    />
  )
}
