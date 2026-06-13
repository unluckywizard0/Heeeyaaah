import { describe, it, expect } from 'vitest'
import { parseNotation, validateNotation, rollLocally, resolveD20Keep, totalFromDiceBoxGroups } from './notation'

describe('parseNotation', () => {
  it('parses a single die', () => {
    expect(parseNotation('d20')).toEqual({ terms: [{ qty: 1, sides: 20 }], modifier: 0 })
  })
  it('parses quantity + modifier', () => {
    expect(parseNotation('2d20+5')).toEqual({ terms: [{ qty: 2, sides: 20 }], modifier: 5 })
  })
  it('parses multiple dice terms and a negative modifier', () => {
    expect(parseNotation('1d8+1d6-1')).toEqual({
      terms: [{ qty: 1, sides: 8 }, { qty: 1, sides: 6 }],
      modifier: -1,
    })
  })
  it('ignores whitespace', () => {
    expect(parseNotation(' 4d6 + 2 ')).toEqual({ terms: [{ qty: 4, sides: 6 }], modifier: 2 })
  })
  it('throws on empty input', () => {
    expect(() => parseNotation('')).toThrow()
  })
  it('throws on garbage', () => {
    expect(() => parseNotation('hello')).toThrow('Invalid term')
  })
  it('throws when subtracting dice', () => {
    expect(() => parseNotation('2d20-1d4')).toThrow('Cannot subtract dice')
  })
  it('throws on a trailing operator', () => {
    expect(() => parseNotation('2d6+')).toThrow()
  })
  it('throws when quantity is below 1', () => {
    expect(() => parseNotation('0d6')).toThrow()
  })
  it('throws when quantity exceeds 100', () => {
    expect(() => parseNotation('101d6')).toThrow()
  })
  it('throws when sides are below 2', () => {
    expect(() => parseNotation('1d1')).toThrow()
  })
  it('throws when sides exceed 1000', () => {
    expect(() => parseNotation('2d1001')).toThrow()
  })
})

describe('validateNotation', () => {
  it('accepts valid notation', () => {
    expect(validateNotation('2d20+5')).toEqual({ valid: true })
  })
  it('rejects invalid notation with a message', () => {
    const r = validateNotation('xyz')
    expect(r.valid).toBe(false)
    expect(typeof r.error).toBe('string')
  })
})

describe('rollLocally', () => {
  it('uses the injected RNG deterministically', () => {
    // rng returns 0 -> lowest face (1); 0.999 -> highest face
    const r = rollLocally('2d6+3', () => 0)
    expect(r.dice).toEqual([{ sides: 6, value: 1 }, { sides: 6, value: 1 }])
    expect(r.modifier).toBe(3)
    expect(r.total).toBe(5) // 1 + 1 + 3
  })
  it('produces values within range with default RNG', () => {
    for (let i = 0; i < 50; i++) {
      const r = rollLocally('1d20')
      expect(r.total).toBeGreaterThanOrEqual(1)
      expect(r.total).toBeLessThanOrEqual(20)
    }
  })
})

describe('totalFromDiceBoxGroups', () => {
  it('sums group values', () => {
    expect(totalFromDiceBoxGroups([{ value: 10 }, { value: 4 }])).toBe(14)
  })
})

describe('resolveD20Keep', () => {
  it('keeps the higher die on advantage and adds the modifier', () => {
    expect(resolveD20Keep([7, 15], 'advantage', 5)).toEqual({ kept: 15, dropped: 7, keptIndex: 1, total: 20 })
  })
  it('keeps the lower die on disadvantage', () => {
    expect(resolveD20Keep([7, 15], 'disadvantage', 0)).toEqual({ kept: 7, dropped: 15, keptIndex: 0, total: 7 })
  })
  it('keeps index 0 on a tie', () => {
    expect(resolveD20Keep([12, 12], 'advantage', 0).keptIndex).toBe(0)
  })
  it('throws unless exactly two values', () => {
    expect(() => resolveD20Keep([1, 2, 3], 'advantage', 0)).toThrow()
  })
})
