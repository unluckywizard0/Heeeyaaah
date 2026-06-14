import { describe, it, expect } from 'vitest'
import { sortByInitiative, advanceTurn, delayCurrentTurn, insertReadiedAction } from './turn-order'

describe('sortByInitiative', () => {
  it('orders descending by initiative', () => {
    expect(
      sortByInitiative([
        { id: 'a', initiative: 10 },
        { id: 'b', initiative: 18 },
        { id: 'c', initiative: 5 },
      ])
    ).toEqual(['b', 'a', 'c'])
  })
  it('treats null initiative as lowest', () => {
    expect(
      sortByInitiative([
        { id: 'a', initiative: null },
        { id: 'b', initiative: 1 },
      ])
    ).toEqual(['b', 'a'])
  })
})

describe('advanceTurn', () => {
  const order = ['a', 'b', 'c']

  it('moves to the next combatant within a round', () => {
    expect(advanceTurn(order, { round_number: 1, current_turn_index: 0 })).toEqual({
      round_number: 1,
      current_turn_index: 1,
    })
  })
  it('wraps to the next round after the last combatant', () => {
    expect(advanceTurn(order, { round_number: 1, current_turn_index: 2 })).toEqual({
      round_number: 2,
      current_turn_index: 0,
    })
  })
  it('is a no-op on an empty order', () => {
    expect(advanceTurn([], { round_number: 1, current_turn_index: 0 })).toEqual({
      round_number: 1,
      current_turn_index: 0,
    })
  })
})

describe('delayCurrentTurn', () => {
  it('moves the current combatant to the end of the order', () => {
    expect(delayCurrentTurn(['a', 'b', 'c'], { round_number: 1, current_turn_index: 0 })).toEqual([
      'b',
      'c',
      'a',
    ])
  })
  it('moves a mid-order combatant to the end', () => {
    expect(delayCurrentTurn(['a', 'b', 'c'], { round_number: 1, current_turn_index: 1 })).toEqual([
      'a',
      'c',
      'b',
    ])
  })
  it('is a no-op with fewer than two combatants', () => {
    expect(delayCurrentTurn(['a'], { round_number: 1, current_turn_index: 0 })).toEqual(['a'])
  })
  it('leaves the order unchanged when the last combatant delays', () => {
    // Nothing comes after the last combatant, so the array genuinely doesn't
    // move; delayTurnAction advances the round in that case instead of marking
    // them delayed (which would otherwise re-run their turn immediately).
    expect(delayCurrentTurn(['a', 'b', 'c'], { round_number: 1, current_turn_index: 2 })).toEqual([
      'a',
      'b',
      'c',
    ])
  })
})

describe('insertReadiedAction', () => {
  it('moves a holding combatant to act next', () => {
    // c is holding; b is currently up. c should slot in right before b.
    expect(insertReadiedAction(['a', 'b', 'c'], { round_number: 1, current_turn_index: 1 }, 'c')).toEqual([
      'a',
      'c',
      'b',
    ])
  })
  it('is a no-op if the readying combatant is already current', () => {
    expect(insertReadiedAction(['a', 'b', 'c'], { round_number: 1, current_turn_index: 0 }, 'a')).toEqual([
      'a',
      'b',
      'c',
    ])
  })
})
