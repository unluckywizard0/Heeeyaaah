// Maps `[type]name[/type]` tags (see lib/import/normalize.ts REFERENCE_TAGS)
// to the rules_* table that can resolve them. Types with no entry have no
// dedicated reference table yet and render as plain text.
export type RuleType =
  | 'spell'
  | 'item'
  | 'monster'
  | 'condition'
  | 'feat'
  | 'race'
  | 'class'
  | 'background'
  | 'action'
  | 'skill'
  | 'sense'
  | 'deity'

export const RULE_TABLES: Partial<Record<RuleType, string>> = {
  spell: 'rules_spells',
  monster: 'rules_monsters',
  item: 'rules_items',
  class: 'rules_classes',
  condition: 'rules_conditions',
  feat: 'rules_feats',
  race: 'rules_races',
}

export function isLinkableRuleType(type: string): type is RuleType {
  return type in RULE_TABLES
}
