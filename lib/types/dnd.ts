// ─── Editions ────────────────────────────────────────────────────────────────

export type Edition = '2014' | '2024'

// ─── Users & Campaigns ───────────────────────────────────────────────────────

export type CampaignRole = 'dm' | 'player'

export interface Profile {
  id: string
  email: string | null
  username: string | null
  avatar_url: string | null
  created_at: string
}

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

// A user's membership row with its campaign embedded — shape returned by the
// dashboard query (campaign_members → campaigns).
export interface CampaignMembership {
  role: CampaignRole
  campaign: Campaign
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
  round_number: number
  current_turn_index: number
  initiative_order: string[]
}

export type ActionEconomy = {
  action: boolean
  bonus_action: boolean
  reaction: boolean
  movement_used: number
}

export type TurnStatus = 'normal' | 'delayed' | 'holding'

// The 2024 PHB conditions. Exhaustion is a level (1–6) rather than on/off, but
// the tracker treats it as a badge like the rest; the level lives in notes.
export const CONDITIONS = [
  'Blinded',
  'Charmed',
  'Deafened',
  'Exhaustion',
  'Frightened',
  'Grappled',
  'Incapacitated',
  'Invisible',
  'Paralyzed',
  'Petrified',
  'Poisoned',
  'Prone',
  'Restrained',
  'Stunned',
  'Unconscious',
] as const

export type ConditionName = (typeof CONDITIONS)[number]

// name -> rounds remaining. A condition present in `conditions` but absent here
// is indefinite; one listed here ticks down and clears at the end of a round.
export type ConditionTimers = Record<string, number>

export interface CombatCreature {
  id: string
  encounter_id: string
  name: string
  dex_mod: number
  initiative: number | null
  hp_current: number
  hp_max: number
  temp_hp: number
  ac: number
  conditions: string[]
  condition_timers: ConditionTimers
  concentration: boolean
  death_save_successes: number
  death_save_failures: number
  action_economy: ActionEconomy
  turn_status: TurnStatus
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

// A saved encounter calculator configuration (KAN-26). Stored per campaign and
// round-trips the calculator's own state: party groups (level/count) and monster
// groups (CR/count), mirroring PartyGroup[] / MonsterGroup[] from
// lib/encounter/difficulty without coupling this leaf types module to it.
export interface EncounterTemplate {
  id: string
  campaign_id: string
  created_by: string
  name: string
  party: Array<{ level: number; count: number }>
  monsters: Array<{ cr: number; count: number }>
  created_at: string
  updated_at: string
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
  request_id: string | null
  created_at: string
}

export interface RollRequest {
  id: string
  campaign_id: string
  requested_by: string
  label: string
  kind: 'check' | 'save'
  dc: number | null
  target_user_id: string | null
  is_open: boolean
  created_at: string
}

// ─── Session notes ────────────────────────────────────────────────────────────

export type NoteVisibility = 'dm_only' | 'shared'

export interface SessionNote {
  id: string
  campaign_id: string
  author_id: string
  title: string
  body: string
  visibility: NoteVisibility
  session_date: string | null
  created_at: string
  updated_at: string
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
