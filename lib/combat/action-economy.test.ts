import { describe, it, expect } from 'vitest'
import { FRESH_ECONOMY, resetEconomy, toggleSlot, setMovementUsed } from './action-economy'

describe('resetEconomy', () => {
  it('returns every slot available and no movement spent', () => {
    expect(resetEconomy()).toEqual({
      action: true,
      bonus_action: true,
      reaction: true,
      movement_used: 0,
    })
  })
  it('returns a fresh object, not the shared constant', () => {
    expect(resetEconomy()).not.toBe(FRESH_ECONOMY)
  })
})

describe('toggleSlot', () => {
  it('spends an available slot', () => {
    expect(toggleSlot(resetEconomy(), 'action')).toEqual({
      action: false,
      bonus_action: true,
      reaction: true,
      movement_used: 0,
    })
  })
  it('refunds a spent slot', () => {
    const spent = { action: false, bonus_action: true, reaction: true, movement_used: 0 }
    expect(toggleSlot(spent, 'action').action).toBe(true)
  })
  it('only touches the named slot', () => {
    expect(toggleSlot(resetEconomy(), 'reaction')).toEqual({
      action: true,
      bonus_action: true,
      reaction: false,
      movement_used: 0,
    })
  })
  it('does not mutate the input', () => {
    const econ = resetEconomy()
    toggleSlot(econ, 'bonus_action')
    expect(econ.bonus_action).toBe(true)
  })
})

describe('setMovementUsed', () => {
  it('records movement spent', () => {
    expect(setMovementUsed(resetEconomy(), 30).movement_used).toBe(30)
  })
  it('clamps negatives to zero', () => {
    expect(setMovementUsed(resetEconomy(), -5).movement_used).toBe(0)
  })
  it('floors fractional feet', () => {
    expect(setMovementUsed(resetEconomy(), 12.9).movement_used).toBe(12)
  })
  it('leaves the slots untouched', () => {
    const econ = { action: false, bonus_action: false, reaction: true, movement_used: 0 }
    expect(setMovementUsed(econ, 15)).toEqual({
      action: false,
      bonus_action: false,
      reaction: true,
      movement_used: 15,
    })
  })
})
