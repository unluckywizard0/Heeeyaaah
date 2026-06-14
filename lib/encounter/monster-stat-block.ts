// KAN-24 — Extract a compact stat block from a rules_monsters `data` blob.
//
// `data` is the raw 5e.tools bestiary entity (see lib/import/transformers.ts),
// whose fields are loosely typed and come in several shapes — AC can be a bare
// number or an object, HP carries an average + formula, ability scores are flat
// numbers. These pure helpers pull out just what the encounter builder previews,
// staying defensive so a missing or oddly-shaped field degrades to a dash.

export interface MonsterStatBlock {
  ac: number | null
  acText: string
  hp: number | null
  hpText: string
  speed: string
  abilities: { key: AbilityKey; label: string; score: number | null }[]
  size: string
  typeText: string
}

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

const ABILITY_ORDER: { key: AbilityKey; label: string }[] = [
  { key: 'str', label: 'STR' },
  { key: 'dex', label: 'DEX' },
  { key: 'con', label: 'CON' },
  { key: 'int', label: 'INT' },
  { key: 'wis', label: 'WIS' },
  { key: 'cha', label: 'CHA' },
]

const SIZE_LABELS: Record<string, string> = {
  T: 'Tiny',
  S: 'Small',
  M: 'Medium',
  L: 'Large',
  H: 'Huge',
  G: 'Gargantuan',
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v)
const asNumber = (v: unknown): number | null => (typeof v === 'number' ? v : null)
const asString = (v: unknown): string | null => (typeof v === 'string' ? v : null)

/** Armour class: 5e.tools gives a number or [{ac, from}] / [number]. */
function parseAc(raw: unknown): { ac: number | null; acText: string } {
  const first = Array.isArray(raw) ? raw[0] : raw
  if (typeof first === 'number') return { ac: first, acText: String(first) }
  if (isRecord(first)) {
    const ac = asNumber(first.ac)
    const from = Array.isArray(first.from) ? first.from.filter((f): f is string => typeof f === 'string') : []
    return { ac, acText: ac == null ? '—' : from.length ? `${ac} (${from.join(', ')})` : String(ac) }
  }
  return { ac: null, acText: '—' }
}

/** Hit points: { average, formula } or { special }. */
function parseHp(raw: unknown): { hp: number | null; hpText: string } {
  if (isRecord(raw)) {
    const avg = asNumber(raw.average)
    const formula = asString(raw.formula)
    if (avg != null) return { hp: avg, hpText: formula ? `${avg} (${formula})` : String(avg) }
    const special = asString(raw.special)
    if (special) return { hp: null, hpText: special }
  }
  const n = asNumber(raw)
  return n != null ? { hp: n, hpText: String(n) } : { hp: null, hpText: '—' }
}

/** Walking/other speeds: { walk: 30, fly: 60 } with values number or { number }. */
function parseSpeed(raw: unknown): string {
  if (typeof raw === 'number') return `${raw} ft.`
  if (!isRecord(raw)) return '—'
  const parts: string[] = []
  for (const [mode, value] of Object.entries(raw)) {
    const n = asNumber(value) ?? (isRecord(value) ? asNumber(value.number) : null)
    if (n == null) continue
    parts.push(mode === 'walk' ? `${n} ft.` : `${mode} ${n} ft.`)
  }
  return parts.length ? parts.join(', ') : '—'
}

function parseSize(raw: unknown): string {
  const code = Array.isArray(raw) ? raw[0] : raw
  return (typeof code === 'string' && SIZE_LABELS[code]) || '—'
}

/** Type: a bare string or { type, tags }. */
function parseType(raw: unknown): string {
  if (typeof raw === 'string') return raw
  if (isRecord(raw)) {
    const t = asString(raw.type)
    const tags = Array.isArray(raw.tags)
      ? raw.tags.map((tag) => (isRecord(tag) ? asString(tag.tag) : asString(tag))).filter(Boolean)
      : []
    if (t) return tags.length ? `${t} (${tags.join(', ')})` : t
  }
  return '—'
}

export function extractStatBlock(data: unknown): MonsterStatBlock {
  const d = isRecord(data) ? data : {}
  const { ac, acText } = parseAc(d.ac)
  const { hp, hpText } = parseHp(d.hp)
  return {
    ac,
    acText,
    hp,
    hpText,
    speed: parseSpeed(d.speed),
    abilities: ABILITY_ORDER.map(({ key, label }) => ({ key, label, score: asNumber(d[key]) })),
    size: parseSize(d.size),
    typeText: parseType(d.type),
  }
}

/** Standard 5e ability modifier for a score, e.g. 14 → +2. */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

/** Signed modifier label, e.g. 2 → "+2", -1 → "−1". */
export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `−${Math.abs(mod)}`
}
