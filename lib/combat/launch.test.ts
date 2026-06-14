import { describe, it, expect } from 'vitest'
import { monsterCombatantDrafts } from './launch'
import { crDefaults } from '@/lib/encounter/cr-defaults'

describe('monsterCombatantDrafts', () => {
  it('expands a group into one draft per monster, numbered from 1', () => {
    const drafts = monsterCombatantDrafts([{ cr: 0.25, count: 3 }])
    expect(drafts.map((d) => d.name)).toEqual([
      'CR 1/4 Monster 1',
      'CR 1/4 Monster 2',
      'CR 1/4 Monster 3',
    ])
  })
  it('fills hp/ac from the CR defaults and starts at full health', () => {
    const [draft] = monsterCombatantDrafts([{ cr: 1, count: 1 }])
    const { ac, hp } = crDefaults(1)
    expect(draft).toEqual({
      name: 'CR 1 Monster 1',
      dex_mod: 0,
      hp_current: hp,
      hp_max: hp,
      ac,
      is_player: false,
    })
  })
  it('handles multiple groups and an empty list', () => {
    expect(monsterCombatantDrafts([{ cr: 1, count: 1 }, { cr: 2, count: 2 }])).toHaveLength(3)
    expect(monsterCombatantDrafts([])).toEqual([])
  })
  it('ignores non-positive counts', () => {
    expect(monsterCombatantDrafts([{ cr: 1, count: 0 }])).toEqual([])
  })
})
