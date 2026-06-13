import { slugify, normalizeDeep } from './normalize'
import { resolveEdition, SPELL_SCHOOLS, parseCr } from './sources'

// 5e.tools entities are loosely typed JSON; access fields through small guards
// rather than `any` so the transforms stay type-safe.
export type RawEntity = Record<string, unknown>

const asString = (v: unknown): string | null => (typeof v === 'string' ? v : null)
const asNumber = (v: unknown): number | null => (typeof v === 'number' ? v : null)
const asRecord = (v: unknown): RawEntity | null =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as RawEntity) : null
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

export const entityName = (raw: RawEntity): string | null => asString(raw.name)
const sourceOf = (raw: RawEntity): string => asString(raw.source) ?? 'UNK'

// rules_* rows are JSON records destined for Supabase upsert; the index signature
// lets them flow into the importer's generic `Row` payload type while keeping the
// named fields strongly typed.
interface RuleRow {
  [key: string]: unknown
}

export interface SpellRow extends RuleRow {
  slug: string
  name: string
  source: string
  edition: string
  level: number | null
  school: string | null
  classes: string[]
  data: RawEntity
}

export interface MonsterRow extends RuleRow {
  slug: string
  name: string
  source: string
  edition: string
  cr: number | null
  type: string | null
  data: RawEntity
}

export interface ItemRow extends RuleRow {
  slug: string
  name: string
  source: string
  edition: string
  rarity: string | null
  item_type: string | null
  data: RawEntity
}

export interface GenericRow extends RuleRow {
  slug: string
  name: string
  source: string
  edition: string
  data: RawEntity
}

export interface ConditionRow extends RuleRow {
  slug: string
  name: string
  data: RawEntity
}

function extractSpellClasses(raw: RawEntity): string[] {
  const classes = asRecord(raw.classes)
  if (!classes) return []
  const out = new Set<string>()
  for (const c of asArray(classes.fromClassList)) {
    const name = asString(asRecord(c)?.name)
    if (name) out.add(name)
  }
  for (const s of asArray(classes.fromSubclass)) {
    const name = asString(asRecord(asRecord(s)?.class)?.name)
    if (name) out.add(name)
  }
  return [...out]
}

export function transformSpell(raw: RawEntity): SpellRow {
  const name = entityName(raw) ?? 'Unknown'
  const source = sourceOf(raw)
  const schoolCode = asString(raw.school)
  return {
    slug: slugify(name),
    name,
    source,
    edition: resolveEdition(raw, source),
    level: asNumber(raw.level),
    school: schoolCode ? SPELL_SCHOOLS[schoolCode] ?? schoolCode : null,
    classes: extractSpellClasses(raw),
    data: normalizeDeep(raw),
  }
}

export function transformMonster(raw: RawEntity): MonsterRow {
  const name = entityName(raw) ?? 'Unknown'
  const source = sourceOf(raw)
  const type = asString(raw.type) ?? asString(asRecord(raw.type)?.type)
  return {
    slug: slugify(name),
    name,
    source,
    edition: resolveEdition(raw, source),
    cr: parseCr(raw.cr),
    type,
    data: normalizeDeep(raw),
  }
}

export function transformItem(raw: RawEntity): ItemRow {
  const name = entityName(raw) ?? 'Unknown'
  const source = sourceOf(raw)
  const typeCode = asString(raw.type)
  return {
    slug: slugify(name),
    name,
    source,
    edition: resolveEdition(raw, source),
    rarity: asString(raw.rarity),
    item_type: typeCode ? typeCode.split('|')[0] : null,
    data: normalizeDeep(raw),
  }
}

export function transformGeneric(raw: RawEntity): GenericRow {
  const name = entityName(raw) ?? 'Unknown'
  const source = sourceOf(raw)
  return {
    slug: slugify(name),
    name,
    source,
    edition: resolveEdition(raw, source),
    data: normalizeDeep(raw),
  }
}

export function transformCondition(raw: RawEntity): ConditionRow {
  const name = entityName(raw) ?? 'Unknown'
  return {
    slug: slugify(name),
    name,
    data: normalizeDeep(raw),
  }
}
