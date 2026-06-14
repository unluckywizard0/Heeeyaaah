import { describe, it, expect } from 'vitest'
import { crDefaults } from './cr-defaults'
import { CR_VALUES } from './xp-tables'

describe('crDefaults', () => {
  it('returns the published AC/HP for known CRs', () => {
    expect(crDefaults(0)).toEqual({ ac: 13, hp: 4 })
    expect(crDefaults(1)).toEqual({ ac: 13, hp: 78 })
    expect(crDefaults(20)).toEqual({ ac: 19, hp: 378 })
  })
  it('has an entry for every CR the calculator offers', () => {
    for (const cr of CR_VALUES) {
      expect(crDefaults(cr).hp).toBeGreaterThan(0)
    }
  })
  it('falls back to the nearest known CR below an unlisted value', () => {
    expect(crDefaults(0.75)).toEqual(crDefaults(0.5))
  })
  it('never returns weaker stats for a higher CR', () => {
    for (let i = 1; i < CR_VALUES.length; i++) {
      expect(crDefaults(CR_VALUES[i]).hp).toBeGreaterThanOrEqual(crDefaults(CR_VALUES[i - 1]).hp)
    }
  })
})
