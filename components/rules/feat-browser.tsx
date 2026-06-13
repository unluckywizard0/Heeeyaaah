'use client'

import { RuleBrowser, type RuleBrowserFilter } from '@/components/rules/rule-browser'
import type { Edition } from '@/lib/types/dnd'

interface FeatListItem {
  id: string
  name: string
  edition: Edition
}

const filters: RuleBrowserFilter<FeatListItem>[] = [
  {
    key: 'edition',
    label: 'Edition',
    options: () => ['2024', '2014'],
    match: (row, value) => row.edition === value,
  },
]

export function FeatBrowser() {
  return (
    <RuleBrowser<FeatListItem>
      table="rules_feats"
      select="id, name, edition"
      ruleType="feat"
      filters={filters}
      noun="feats"
    />
  )
}
