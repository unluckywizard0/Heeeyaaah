import { describe, expect, it } from 'vitest'
import { extractStatBlock, abilityModifier, formatModifier } from './monster-stat-block'

// A representative slice of a 5e.tools bestiary entity (goblin-ish).
const goblin = {
  size: ['S'],
  type: { type: 'humanoid', tags: [{ tag: 'goblinoid' }] },
  ac: [{ ac: 15, from: ['leather armor', 'shield'] }],
  hp: { average: 7, formula: '2d6' },
  speed: { walk: 30 },
  str: 8,
  dex: 14,
  con: 10,
  int: 10,
  wis: 8,
  cha: 8,
  action: [
    {
      name: 'Scimitar',
      entries: [
        '{@atk mw} {@hit 4} to hit, reach 5 ft., one target. {@h}5 ({@damage 1d6+2}) slashing damage.',
      ],
    },
    {
      name: 'Fire Breath',
      entries: [
        'Each creature in the area must make a {@dc 13} Dexterity saving throw, taking {@damage 4d6} fire damage on a failed save.',
      ],
    },
  ],
}

describe('extractStatBlock', () => {
  it('pulls AC with its source list', () => {
    const sb = extractStatBlock(goblin)
    expect(sb.ac).toBe(15)
    expect(sb.acText).toBe('15 (leather armor, shield)')
  })

  it('pulls HP average and formula', () => {
    const sb = extractStatBlock(goblin)
    expect(sb.hp).toBe(7)
    expect(sb.hpText).toBe('7 (2d6)')
  })

  it('formats walking speed and extra movement modes', () => {
    expect(extractStatBlock(goblin).speed).toBe('30 ft.')
    expect(extractStatBlock({ speed: { walk: 30, fly: 60 } }).speed).toBe('30 ft., fly 60 ft.')
  })

  it('lists the six ability scores in order', () => {
    const sb = extractStatBlock(goblin)
    expect(sb.abilities.map((a) => a.label)).toEqual(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'])
    expect(sb.abilities.map((a) => a.score)).toEqual([8, 14, 10, 10, 8, 8])
  })

  it('resolves size and type labels', () => {
    const sb = extractStatBlock(goblin)
    expect(sb.size).toBe('Small')
    expect(sb.typeText).toBe('humanoid (goblinoid)')
  })

  it('accepts a bare-number AC and a plain string type', () => {
    const sb = extractStatBlock({ ac: [13], type: 'beast', hp: 11 })
    expect(sb.ac).toBe(13)
    expect(sb.acText).toBe('13')
    expect(sb.typeText).toBe('beast')
    expect(sb.hp).toBe(11)
  })

  it('degrades gracefully on missing or junk data', () => {
    const sb = extractStatBlock(null)
    expect(sb.ac).toBeNull()
    expect(sb.acText).toBe('—')
    expect(sb.hpText).toBe('—')
    expect(sb.speed).toBe('—')
    expect(sb.size).toBe('—')
    expect(sb.abilities.every((a) => a.score === null)).toBe(true)
  })

  it('handles HP given as a special string', () => {
    expect(extractStatBlock({ hp: { special: '0' } }).hpText).toBe('0')
  })

  it('parses an attack action into hit bonus, damage dice, and readable text', () => {
    const [scimitar] = extractStatBlock(goblin).actions
    expect(scimitar.name).toBe('Scimitar')
    expect(scimitar.attackBonus).toBe(4)
    expect(scimitar.damageDice).toEqual(['1d6+2'])
    expect(scimitar.saveDc).toBeNull()
    expect(scimitar.text).toBe('Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6+2) slashing damage.')
  })

  it('parses a save-based action into its DC and damage dice', () => {
    const [, breath] = extractStatBlock(goblin).actions
    expect(breath.name).toBe('Fire Breath')
    expect(breath.attackBonus).toBeNull()
    expect(breath.saveDc).toBe(13)
    expect(breath.damageDice).toEqual(['4d6'])
    expect(breath.text).toBe('Each creature in the area must make a DC 13 Dexterity saving throw, taking 4d6 fire damage on a failed save.')
  })

  it('returns no actions when the field is missing', () => {
    expect(extractStatBlock({}).actions).toEqual([])
  })
})

describe('abilityModifier / formatModifier', () => {
  it('computes 5e modifiers', () => {
    expect(abilityModifier(10)).toBe(0)
    expect(abilityModifier(14)).toBe(2)
    expect(abilityModifier(8)).toBe(-1)
    expect(abilityModifier(20)).toBe(5)
  })

  it('formats signed modifiers with a real minus sign', () => {
    expect(formatModifier(2)).toBe('+2')
    expect(formatModifier(0)).toBe('+0')
    expect(formatModifier(-1)).toBe('−1')
  })
})
