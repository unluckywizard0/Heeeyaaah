import { describe, it, expect } from 'vitest'
import {
  applyDamage,
  applyHealing,
  setTempHp,
  concentrationDc,
  shouldPromptConcentration,
  tickConditionTimers,
  deathSaveOutcome,
} from './vitals'

describe('applyDamage', () => {
  it('reduces current HP with no temp HP', () => {
    expect(applyDamage({ hp_current: 20, temp_hp: 0 }, 7)).toEqual({ hp_current: 13, temp_hp: 0 })
  })
  it('soaks damage with temp HP first', () => {
    expect(applyDamage({ hp_current: 20, temp_hp: 5 }, 3)).toEqual({ hp_current: 20, temp_hp: 2 })
  })
  it('spills overflow past temp HP into current HP', () => {
    expect(applyDamage({ hp_current: 20, temp_hp: 5 }, 8)).toEqual({ hp_current: 17, temp_hp: 0 })
  })
  it('floors current HP at zero', () => {
    expect(applyDamage({ hp_current: 4, temp_hp: 0 }, 99)).toEqual({ hp_current: 0, temp_hp: 0 })
  })
  it('ignores negative damage', () => {
    expect(applyDamage({ hp_current: 10, temp_hp: 0 }, -5)).toEqual({ hp_current: 10, temp_hp: 0 })
  })
})

describe('applyHealing', () => {
  it('heals up to but not beyond max', () => {
    expect(applyHealing({ hp_current: 8, temp_hp: 0 }, 5, 10)).toEqual({ hp_current: 10, temp_hp: 0 })
  })
  it('does not touch temp HP', () => {
    expect(applyHealing({ hp_current: 5, temp_hp: 3 }, 2, 10)).toEqual({ hp_current: 7, temp_hp: 3 })
  })
})

describe('setTempHp', () => {
  it('sets a non-negative temp HP pool', () => {
    expect(setTempHp({ hp_current: 10, temp_hp: 0 }, 5)).toEqual({ hp_current: 10, temp_hp: 5 })
  })
  it('clamps negatives to zero', () => {
    expect(setTempHp({ hp_current: 10, temp_hp: 4 }, -2)).toEqual({ hp_current: 10, temp_hp: 0 })
  })
})

describe('concentrationDc', () => {
  it('is at least 10', () => {
    expect(concentrationDc(8)).toBe(10)
    expect(concentrationDc(0)).toBe(10)
  })
  it('is half the damage when that exceeds 10', () => {
    expect(concentrationDc(22)).toBe(11)
    expect(concentrationDc(40)).toBe(20)
  })
})

describe('shouldPromptConcentration', () => {
  it('prompts only when concentrating and damaged', () => {
    expect(shouldPromptConcentration(true, 5)).toBe(true)
    expect(shouldPromptConcentration(true, 0)).toBe(false)
    expect(shouldPromptConcentration(false, 5)).toBe(false)
  })
})

describe('tickConditionTimers', () => {
  it('decrements each timer by a round', () => {
    expect(tickConditionTimers({ Poisoned: 3, Restrained: 2 })).toEqual({
      timers: { Poisoned: 2, Restrained: 1 },
      expired: [],
    })
  })
  it('expires timers that reach zero', () => {
    expect(tickConditionTimers({ Stunned: 1, Frightened: 2 })).toEqual({
      timers: { Frightened: 1 },
      expired: ['Stunned'],
    })
  })
  it('is empty for no timers', () => {
    expect(tickConditionTimers({})).toEqual({ timers: {}, expired: [] })
  })
})

describe('deathSaveOutcome', () => {
  it('is dying with fewer than three of either', () => {
    expect(deathSaveOutcome({ successes: 2, failures: 2 })).toBe('dying')
  })
  it('is stable at three successes', () => {
    expect(deathSaveOutcome({ successes: 3, failures: 1 })).toBe('stable')
  })
  it('is dead at three failures (failures win ties)', () => {
    expect(deathSaveOutcome({ successes: 3, failures: 3 })).toBe('dead')
  })
})
