// Pure transforms shared by the importer (scripts/import-5etools.ts) and,
// eventually, the in-app rule inliner. No DB or Node-only imports here so these
// stay unit-testable and usable from the browser bundle.

/** URL/identity-safe slug from an entity name. Stable across import runs. */
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '') // strip accents
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'unnamed'
  )
}

// 5e.tools reference tags → the app's [type]text[/type] convention (matches the
// RuleInliner regex /\[(\w+)\]([^\[]+)\[\/\1\]/g from the north-star spec).
const REFERENCE_TAGS: Record<string, string> = {
  spell: 'spell',
  item: 'item',
  creature: 'monster',
  condition: 'condition',
  disease: 'condition',
  status: 'condition',
  feat: 'feat',
  race: 'race',
  class: 'class',
  background: 'background',
  action: 'action',
  skill: 'skill',
  sense: 'sense',
  deity: 'deity',
}

/**
 * Collapse 5e.tools `{@tag ...}` markup in a single string.
 *   - Reference tags become `[type]display[/type]` for later linking.
 *   - Formatting tags (dice, damage, dc, hit, …) collapse to readable text.
 * 5e.tools encodes overrides as `{@tag name|source|displayText}`; we surface the
 * display text when present, else the entity name.
 */
export function normalizeTags(input: string): string {
  if (!input || !input.includes('{@')) return input

  const re = /\{@(\w+)(?:\s+([^{}]*?))?\}/g
  let out = input
  let prev: string

  do {
    prev = out
    out = out.replace(re, (_match, tag: string, body = '') => {
      const parts = String(body).split('|')
      const name = parts[0] ?? ''
      const override = parts.length >= 3 ? parts[2] : ''
      const display = override || name

      const refType = REFERENCE_TAGS[tag]
      if (refType) return `[${refType}]${display}[/${refType}]`

      switch (tag) {
        case 'dice':
        case 'damage':
        case 'd20':
        case 'scaledice':
        case 'scaledamage':
        case 'autodice':
          return name
        case 'hit':
          return `+${name}`
        case 'dc':
          return `DC ${name}`
        case 'recharge':
          return name ? `(Recharge ${name})` : '(Recharge)'
        case 'chance':
          return `${name} percent`
        case 'h': // average-damage marker, no display text
        case 'atk':
        case 'atkr':
          return ''
        default:
          return display
      }
    })
  } while (out !== prev && out.includes('{@'))

  return out
}

/** Recursively apply {@tag} normalization to every string in a JSON value. */
export function normalizeDeep<T>(value: T): T {
  if (typeof value === 'string') return normalizeTags(value) as unknown as T
  if (Array.isArray(value)) return value.map((v) => normalizeDeep(v)) as unknown as T
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = normalizeDeep(v)
    return out as unknown as T
  }
  return value
}
