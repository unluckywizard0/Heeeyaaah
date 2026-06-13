// ─── Editions ────────────────────────────────────────────────────────────────

export type Edition = '2014' | '2024'

// ─── Users & Campaigns ───────────────────────────────────────────────────────

export type CampaignRole = 'dm' | 'player'

export interface Campaign {
  id: string
  name: string
  dm_user_id: string
  edition: Edition
  invite_code: string
  created_at: string
}

export interface CampaignMember {
  id: string
  campaign_id: string
  user_id: string
  role: CampaignRole
  joined_at: string
}

// ─── Character ────────────────────────────────────────────────────────────────

export interface AbilityScores {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

export interface HpBlock {
  current: number
  max: number
  temp: number
}

export interface DeathSaves {
  successes: number
  failures: number
}

export interface Character {
  id: string
  user_id: string
  campaign_id: string | null
  name: string
  edition: Edition
  class_data: Record<string, unknown>
  species_data: Record<string, unknown> // 2024-first: "race" renamed to "species"
  background_data: Record<string, unknown>
  stats: AbilityScores
  hp: HpBlock
  spells: Record<string, unknown>
  inventory: Record<string, unknown>
  features: Record<string, unknown>
  conditions: string[]
  death_saves: DeathSaves
  sheet_layout: GridLayout[]
  created_at: string
  updated_at: string
}

export interface GridLayout {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
}

// ─── Combat ──────────────────────────────────────────────────────────────────

export interface CombatEncounter {
  id: string
  campaign_id: string
  name: string
  is_active: boolean
  initiative_order: string[]
}

export type ActionEconomy = {
  action: boolean
  bonus_action: boolean
  reaction: boolean
  movement_used: number
}

export interface CombatCreature {
  id: string
  encounter_id: string
  name: string
  initiative: number
  hp_current: number
  hp_max: number
  ac: number
  conditions: string[]
  action_economy: ActionEconomy
  is_player: boolean
  character_id: string | null
  is_active: boolean
}

export interface CombatCreatureSecret {
  id: string
  creature_id: string
  legendary_actions_remaining: number
  legendary_resistance_remaining: number
  lair_actions: Record<string, unknown>
  dm_notes: string
  revealed_hp: boolean
}

// ─── Encounter Builder ────────────────────────────────────────────────────────

export interface XpBudget {
  easy: number
  medium: number
  hard: number
  deadly: number
}

export interface EncounterTemplate {
  id: string
  campaign_id: string
  name: string
  monsters: Array<{ slug: string; count: number }>
  party_size: number
  party_level: number
  xp_budget: XpBudget
}

// ─── Rolls ───────────────────────────────────────────────────────────────────

export interface RollResult {
  dice: string
  rolls: number[]
  modifier: number
  total: number
}

export interface RollHistory {
  id: string
  campaign_id: string
  user_id: string
  character_id: string | null
  expression: string
  results: RollResult
  context: string
  is_private: boolean
  created_at: string
}

// ─── Rules content (seeded from 5e.tools) ────────────────────────────────────

export interface RulesSpell {
  id: string
  slug: string
  name: string
  source: string
  edition: Edition
  level: number
  school: string
  classes: string[]
  data: Record<string, unknown>
}

export interface RulesMonster {
  id: string
  slug: string
  name: string
  source: string
  edition: Edition
  cr: number
  type: string
  data: Record<string, unknown>
}

export interface RulesItem {
  id: string
  slug: string
  name: string
  source: string
  edition: Edition
  rarity: string
  item_type: string
  data: Record<string, unknown>
}

// ─── Homebrew ─────────────────────────────────────────────────────────────────

// TODO(KAN-58): extension point for homebrew classes, subclasses, species, backgrounds, feats
export type HomebrewType = 'spell' | 'weapon' | 'item' | 'monster' | 'feat'

export interface CustomContent {
  id: string
  user_id: string
  campaign_id: string | null
  type: HomebrewType
  name: string
  slug: string
  data: Record<string, unknown>
  is_campaign_shared: boolean
  created_at: string
}
