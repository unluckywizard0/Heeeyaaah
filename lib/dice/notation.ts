export type RollMode = 'normal' | 'advantage' | 'disadvantage'

export interface ParsedTerm {
  qty: number
  sides: number
}
export interface ParsedNotation {
  terms: ParsedTerm[]
  modifier: number
}

const TERM = /^([0-9]*)d([0-9]+)$/i

/** Parse standard dice notation ("2d20+5", "d20", "1d8+1d6-1") into dice terms + a flat modifier. */
export function parseNotation(input: string): ParsedNotation {
  const cleaned = input.replace(/\s+/g, '')
  if (!cleaned) throw new Error('Enter dice notation, e.g. 2d20+5')
  if (/[+-]$/.test(cleaned)) throw new Error('Notation cannot end with + or -')

  const tokens = cleaned.match(/[+-]?[^+-]+/g)
  if (!tokens) throw new Error('Invalid dice notation')

  const terms: ParsedTerm[] = []
  let modifier = 0

  for (const tok of tokens) {
    const sign = tok.startsWith('-') ? -1 : 1
    const body = tok.replace(/^[+-]/, '')

    if (/^[0-9]+$/.test(body)) {
      modifier += sign * parseInt(body, 10)
      continue
    }

    const m = TERM.exec(body)
    if (!m) throw new Error(`Invalid term: "${tok}"`)
    if (sign < 0) throw new Error('Cannot subtract dice; use a numeric modifier')

    const qty = m[1] === '' ? 1 : parseInt(m[1], 10)
    const sides = parseInt(m[2], 10)
    if (qty < 1 || qty > 100) throw new Error('Dice quantity must be 1–100')
    if (sides < 2 || sides > 1000) throw new Error('Dice sides must be 2–1000')

    terms.push({ qty, sides })
  }

  if (terms.length === 0) throw new Error('No dice in notation')
  return { terms, modifier }
}

/** Non-throwing validation for UI. */
export function validateNotation(input: string): { valid: boolean; error?: string } {
  try {
    parseNotation(input)
    return { valid: true }
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : 'Invalid notation' }
  }
}
