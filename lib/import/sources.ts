import type { Edition } from '@/lib/types/dnd'

// 2024 ("One D&D") core sourcebooks in 5e.tools shorthand. Most 2024 entities
// also carry an explicit `edition: "one"` flag, which we prefer when present;
// this set is the fallback for entities that only identify themselves by source.
export const EDITION_2024_SOURCES = new Set(['XPHB', 'XDMG', 'XMM'])

/** Resolve an entity's rules edition. Prefers the explicit flag, falls back to source. */
export function resolveEdition(entity: { edition?: string }, source: string): Edition {
  const flag = entity.edition?.toLowerCase()
  if (flag === 'one' || flag === '2024') return '2024'
  if (flag === 'classic' || flag === '2014') return '2014'
  return EDITION_2024_SOURCES.has(source.toUpperCase()) ? '2024' : '2014'
}

// Single-letter school codes used throughout 5e.tools spell data.
export const SPELL_SCHOOLS: Record<string, string> = {
  A: 'Abjuration',
  C: 'Conjuration',
  D: 'Divination',
  E: 'Enchantment',
  V: 'Evocation',
  I: 'Illusion',
  N: 'Necromancy',
  T: 'Transmutation',
  P: 'Psionic',
}

const FRACTIONAL_CR: Record<string, number> = {
  '0': 0,
  '1/8': 0.125,
  '1/4': 0.25,
  '1/2': 0.5,
}

/** Normalize a 5e.tools CR (string, number, or `{ cr, lair, … }` object) to a decimal. */
export function parseCr(cr: unknown): number | null {
  if (cr == null) return null
  const raw =
    typeof cr === 'object' ? (cr as { cr?: unknown }).cr : cr
  if (raw == null) return null
  const key = String(raw).trim()
  if (key in FRACTIONAL_CR) return FRACTIONAL_CR[key]
  const n = Number(key)
  return Number.isFinite(n) ? n : null
}
