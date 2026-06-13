import { describe, it, expect } from 'vitest'
import { parseNotation, validateNotation } from './notation'

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
