import { describe, it, expect } from 'vitest'
import { hpPercent, isDown, isBloodied, summarizeParty } from './party'
import type { CombatCreature } from '@/lib/types/dnd'

/** Minimal player combatant for status tests; only the fields under test matter. */
function player(overrides: Partial<CombatCreature> = {}): CombatCreature {
  return {
    id: 'c',
    encounter_id: 'e',
    name: 'Hero',
    dex_mod: 0,
    initiative: 10,
    hp_current: 20,
    hp_max: 20,
    temp_hp: 0,
    ac: 15,
    conditions: [],
    condition_timers: {},
    concentration: false,
    death_save_successes: 0,
    death_save_failures: 0,
    action_economy: { action: true, bonus_action: true, reaction: true, movement_used: 0 },
    turn_status: 'normal',
    is_player: true,
    character_id: null,
    is_active: true,
    ...overrides,
  }
}

describe('hpPercent', () => {
  it('computes a rounded percentage of max', () => {
    expect(hpPercent(15, 20)).toBe(75)
  })
  it('clamps above max to 100', () => {
    expect(hpPercent(25, 20)).toBe(100)
  })
  it('floors at 0 for negative current HP', () => {
    expect(hpPercent(-5, 20)).toBe(0)
  })
  it('returns 0 when max is 0', () => {
    expect(hpPercent(0, 0)).toBe(0)
  })
})

describe('isDown', () => {
  it('is true at exactly 0 HP', () => {
    expect(isDown({ hp_current: 0 })).toBe(true)
  })
  it('is false above 0 HP', () => {
    expect(isDown({ hp_current: 1 })).toBe(false)
  })
})

describe('isBloodied', () => {
  it('is true at exactly half HP', () => {
    expect(isBloodied({ hp_current: 10, hp_max: 20 })).toBe(true)
  })
  it('is false above half HP', () => {
    expect(isBloodied({ hp_current: 11, hp_max: 20 })).toBe(false)
  })
  it('is false when down (0 HP is reported separately)', () => {
    expect(isBloodied({ hp_current: 0, hp_max: 20 })).toBe(false)
  })
})

describe('summarizeParty', () => {
  it('ignores non-player combatants', () => {
    const creatures = [player(), player({ is_player: false, hp_current: 0 })]
    expect(summarizeParty(creatures).total).toBe(1)
  })

  it('buckets healthy, bloodied, dying, and dead players', () => {
    const creatures = [
      player({ id: '1', hp_current: 20, hp_max: 20 }), // healthy
      player({ id: '2', hp_current: 8, hp_max: 20 }), // bloodied
      player({ id: '3', hp_current: 0, death_save_failures: 1 }), // dying
      player({ id: '4', hp_current: 0, death_save_failures: 3 }), // dead
    ]
    expect(summarizeParty(creatures)).toEqual({
      total: 4,
      healthy: 1,
      bloodied: 1,
      dying: 1,
      dead: 1,
    })
  })

  it('counts a stabilized player toward the total but not as dying', () => {
    const stable = player({ hp_current: 0, death_save_successes: 3 })
    expect(summarizeParty([stable])).toEqual({
      total: 1,
      healthy: 0,
      bloodied: 0,
      dying: 0,
      dead: 0,
    })
  })

  it('is all zeros for an empty roster', () => {
    expect(summarizeParty([])).toEqual({ total: 0, healthy: 0, bloodied: 0, dying: 0, dead: 0 })
  })
})
