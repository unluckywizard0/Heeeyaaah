import { describe, it, expect } from 'vitest'
import { normalizeParty, normalizeMonsters, normalizeTemplateName } from './templates'

describe('normalizeParty', () => {
  it('keeps valid groups as-is', () => {
    expect(normalizeParty([{ level: 5, count: 3 }])).toEqual([{ level: 5, count: 3 }])
  })
  it('clamps level to 1–20 and counts to at least 1', () => {
    expect(normalizeParty([{ level: 99, count: 0 }])).toEqual([{ level: 20, count: 1 }])
    expect(normalizeParty([{ level: 0, count: -2 }])).toEqual([{ level: 1, count: 1 }])
  })
  it('floors fractional values', () => {
    expect(normalizeParty([{ level: 4.9, count: 2.7 }])).toEqual([{ level: 4, count: 2 }])
  })
  it('drops junk entries', () => {
    expect(normalizeParty([{ level: 3, count: 1 }, null, 'x', {}])).toEqual([
      { level: 3, count: 1 },
      { level: 1, count: 1 }, // {} → defaults
    ])
  })
  it('falls back to a default party when empty or not an array', () => {
    expect(normalizeParty([])).toEqual([{ level: 1, count: 4 }])
    expect(normalizeParty(null)).toEqual([{ level: 1, count: 4 }])
    expect(normalizeParty('nope')).toEqual([{ level: 1, count: 4 }])
  })
})

describe('normalizeMonsters', () => {
  it('keeps valid groups including fractional CR', () => {
    expect(normalizeMonsters([{ cr: 0.25, count: 6 }])).toEqual([{ cr: 0.25, count: 6 }])
  })
  it('clamps count to at least 1', () => {
    expect(normalizeMonsters([{ cr: 1, count: 0 }])).toEqual([{ cr: 1, count: 1 }])
  })
  it('drops entries with a non-numeric CR', () => {
    expect(normalizeMonsters([{ cr: 'big', count: 2 }, { cr: 2, count: 1 }])).toEqual([
      { cr: 2, count: 1 },
    ])
  })
  it('returns an empty list for empty or non-array input', () => {
    expect(normalizeMonsters([])).toEqual([])
    expect(normalizeMonsters(undefined)).toEqual([])
  })
})

describe('normalizeTemplateName', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeTemplateName('  Goblin ambush  ')).toBe('Goblin ambush')
  })
  it('falls back to a default when blank', () => {
    expect(normalizeTemplateName('   ')).toBe('Untitled encounter')
    expect(normalizeTemplateName(null)).toBe('Untitled encounter')
  })
  it('caps very long names at 80 characters', () => {
    expect(normalizeTemplateName('a'.repeat(200))).toHaveLength(80)
  })
})
