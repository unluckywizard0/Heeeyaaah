'use client'

import { RuleBrowser, type RuleBrowserFilter } from '@/components/rules/rule-browser'
import type { Edition } from '@/lib/types/dnd'

interface ItemListItem {
  id: string
  name: string
  edition: Edition
  rarity: string | null
  item_type: string | null
}

const filters: RuleBrowserFilter<ItemListItem>[] = [
  {
    key: 'edition',
    label: 'Edition',
    options: () => ['2024', '2014'],
    match: (row, value) => row.edition === value,
  },
  {
    key: 'rarity',
    label: 'Rarity',
    options: (rows) =>
      [...new Set(rows.map((r) => r.rarity).filter((r): r is string => !!r))].sort(),
    match: (row, value) => row.rarity === value,
  },
  {
    key: 'item_type',
    label: 'Type',
    options: (rows) =>
      [...new Set(rows.map((r) => r.item_type).filter((t): t is string => !!t))].sort(),
    match: (row, value) => row.item_type === value,
  },
]

export function ItemBrowser() {
  return (
    <RuleBrowser<ItemListItem>
      table="rules_items"
      select="id, name, edition, rarity, item_type"
      ruleType="item"
      filters={filters}
      meta={(row) => [row.rarity, row.item_type].filter(Boolean).join(' • ')}
      noun="items"
    />
  )
}
