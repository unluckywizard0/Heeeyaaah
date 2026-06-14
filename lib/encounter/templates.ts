// Pure normalisation for saved encounter templates (KAN-26). Both the save path
// (calculator state → DB) and the load path (jsonb from DB → calculator state)
// run through these so a malformed or hand-edited row can never feed NaN counts
// or junk shapes into the difficulty maths. Side-effect free and unit-tested.

import type { PartyGroup, MonsterGroup } from './difficulty'
import { CR_VALUES } from './xp-tables'

const MAX_LEVEL = 20
const MIN_CR = Math.min(...CR_VALUES)
const MAX_CR = Math.max(...CR_VALUES)

function toInt(value: unknown, fallback: number): number {
  const n = Math.floor(Number(value))
  return Number.isFinite(n) ? n : fallback
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Coerce one raw party entry into a valid group, or null if unusable. */
function normalizePartyGroup(raw: unknown): PartyGroup | null {
  if (!raw || typeof raw !== 'object') return null
  const { level, count } = raw as Record<string, unknown>
  return {
    level: clamp(toInt(level, 1), 1, MAX_LEVEL),
    count: Math.max(1, toInt(count, 1)),
  }
}

/** Coerce one raw monster entry into a valid group, or null if unusable. */
function normalizeMonsterGroup(raw: unknown): MonsterGroup | null {
  if (!raw || typeof raw !== 'object') return null
  const { cr, count } = raw as Record<string, unknown>
  const crNum = Number(cr)
  if (!Number.isFinite(crNum)) return null
  return {
    cr: clamp(crNum, MIN_CR, MAX_CR),
    count: Math.max(1, toInt(count, 1)),
  }
}

/**
 * Normalise a party list. Drops unusable entries; a party with no valid groups
 * falls back to a single level-1 character so the calculator always has a row.
 */
export function normalizeParty(raw: unknown): PartyGroup[] {
  const groups = Array.isArray(raw)
    ? raw.map(normalizePartyGroup).filter((g): g is PartyGroup => g !== null)
    : []
  return groups.length > 0 ? groups : [{ level: 1, count: 4 }]
}

/** Normalise a monster list. Drops unusable entries; an empty list is valid. */
export function normalizeMonsters(raw: unknown): MonsterGroup[] {
  return Array.isArray(raw)
    ? raw.map(normalizeMonsterGroup).filter((g): g is MonsterGroup => g !== null)
    : []
}

/** Trim and bound a template name, falling back to a default when blank. */
export function normalizeTemplateName(raw: unknown): string {
  const name = String(raw ?? '').trim()
  return name ? name.slice(0, 80) : 'Untitled encounter'
}
