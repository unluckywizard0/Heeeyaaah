import { describe, it, expect } from 'vitest'
import { partyBudget, encounterXp, rateEncounter, addMonster } from './difficulty'
import { monsterXpForCr, formatCrValue } from './xp-tables'

describe('addMonster', () => {
  it('appends a new monster group', () => {
    expect(addMonster([], { cr: 1, count: 1, name: 'Goblin' })).toEqual([
      { cr: 1, count: 1, name: 'Goblin' },
    ])
  })

  it('merges by name + CR, bumping the count', () => {
    const list = [{ cr: 0.25, count: 2, name: 'Goblin' }]
    expect(addMonster(list, { cr: 0.25, count: 1, name: 'Goblin' })).toEqual([
      { cr: 0.25, count: 3, name: 'Goblin' },
    ])
  })

  it('keeps same-CR monsters with different names separate', () => {
    const list = [{ cr: 0.25, count: 1, name: 'Goblin' }]
    const out = addMonster(list, { cr: 0.25, count: 1, name: 'Kobold' })
    expect(out).toHaveLength(2)
  })

  it('does not mutate the input array', () => {
    const list = [{ cr: 1, count: 1, name: 'Goblin' }]
    addMonster(list, { cr: 1, count: 1, name: 'Goblin' })
    expect(list[0].count).toBe(1)
  })
})

describe('partyBudget', () => {
  // Worked examples straight from the 2024 DMG / published references.
  it('four level-1 characters: Low budget is 50 × 4 = 200', () => {
    expect(partyBudget([{ level: 1, count: 4 }]).low).toBe(200)
  })
  it('five level-3 characters: Moderate budget is 225 × 5 = 1125', () => {
    expect(partyBudget([{ level: 3, count: 5 }]).moderate).toBe(1125)
  })
  it('six level-15 characters: High budget is 7800 × 6 = 46800', () => {
    expect(partyBudget([{ level: 15, count: 6 }]).high).toBe(46800)
  })

  it('sums mixed-level parties per difficulty', () => {
    // 2 × L1 (50/75/100) + 1 × L5 (500/750/1100)
    expect(partyBudget([{ level: 1, count: 2 }, { level: 5, count: 1 }])).toEqual({
      low: 600,
      moderate: 900,
      high: 1300,
    })
  })

  it('ignores unknown levels and non-positive counts', () => {
    expect(partyBudget([{ level: 99, count: 4 }, { level: 1, count: 0 }])).toEqual({
      low: 0,
      moderate: 0,
      high: 0,
    })
  })
})

describe('monsterXpForCr', () => {
  it('maps fractional and integer CRs to XP', () => {
    expect(monsterXpForCr(0.125)).toBe(25)
    expect(monsterXpForCr(0.25)).toBe(50)
    expect(monsterXpForCr(1)).toBe(200)
    expect(monsterXpForCr(5)).toBe(1800)
    expect(monsterXpForCr(30)).toBe(155000)
  })
  it('returns 0 for an unknown CR', () => {
    expect(monsterXpForCr(7.5)).toBe(0)
  })
})

describe('encounterXp', () => {
  it('sums monster XP with no 2024 multiplier', () => {
    // 3 × CR 1/4 (50) + 1 × CR 2 (450) = 600
    expect(encounterXp([{ cr: 0.25, count: 3 }, { cr: 2, count: 1 }])).toBe(600)
  })
  it('treats negative counts as zero', () => {
    expect(encounterXp([{ cr: 1, count: -2 }])).toBe(0)
  })
})

describe('rateEncounter', () => {
  const party = [{ level: 1, count: 4 }] // budgets: low 200, moderate 300, high 400

  it('rates an empty encounter as none', () => {
    expect(rateEncounter(party, []).rating).toBe('none')
  })
  it('rates exactly the Low budget as low', () => {
    // 1 × CR 1 = 200 == low budget
    expect(rateEncounter(party, [{ cr: 1, count: 1 }]).rating).toBe('low')
  })
  it('rates between Low and Moderate as moderate', () => {
    // 1 × CR 1 (200) + 1 × CR 1/4 (50) = 250 → (200, 300]
    expect(rateEncounter(party, [{ cr: 1, count: 1 }, { cr: 0.25, count: 1 }]).rating).toBe(
      'moderate'
    )
  })
  it('rates exactly the High budget as high', () => {
    // 2 × CR 1 = 400 == high budget
    expect(rateEncounter(party, [{ cr: 1, count: 2 }]).rating).toBe('high')
  })
  it('rates overspending the High budget as deadly', () => {
    // 1 × CR 2 = 450 > 400
    expect(rateEncounter(party, [{ cr: 2, count: 1 }]).rating).toBe('deadly')
  })
  it('reports totalXp, budget, and fraction of High', () => {
    const a = rateEncounter(party, [{ cr: 1, count: 1 }])
    expect(a.totalXp).toBe(200)
    expect(a.budget).toEqual({ low: 200, moderate: 300, high: 400 })
    expect(a.fractionOfHigh).toBeCloseTo(0.5)
  })
})

describe('formatCrValue', () => {
  it('formats fractional CRs', () => {
    expect(formatCrValue(0.125)).toBe('1/8')
    expect(formatCrValue(0.25)).toBe('1/4')
    expect(formatCrValue(0.5)).toBe('1/2')
    expect(formatCrValue(5)).toBe('5')
  })
})
