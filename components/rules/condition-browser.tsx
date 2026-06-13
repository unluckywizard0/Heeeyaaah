'use client'

import { RuleBrowser } from '@/components/rules/rule-browser'

interface ConditionListItem {
  id: string
  name: string
}

export function ConditionBrowser() {
  return (
    <RuleBrowser<ConditionListItem>
      table="rules_conditions"
      select="id, name"
      ruleType="condition"
      filters={[]}
      noun="conditions"
    />
  )
}
