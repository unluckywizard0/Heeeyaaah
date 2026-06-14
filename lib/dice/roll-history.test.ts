import { describe, expect, it } from 'vitest'
import { toRollResult } from './roll-history'
import type { RollResultView } from '@/stores/dice-store'

describe('toRollResult', () => {
  it('converts a normal multi-die roll, deriving the modifier', () => {
    const view: RollResultView = {
      label: '2d6+3',
      total: 11,
      mode: 'normal',
      dice: [
        { sides: 6, value: 4 },
        { sides: 6, value: 4 },
      ],
    }
    expect(toRollResult(view)).toEqual({ dice: '2d6', rolls: [4, 4], modifier: 3, total: 11 })
  })

  it('excludes the dropped d20 for advantage/disadvantage', () => {
    const view: RollResultView = {
      label: 'd20 (Advantage)+2',
      total: 17,
      mode: 'advantage',
      dice: [
        { sides: 20, value: 15, kept: true },
        { sides: 20, value: 9, kept: false },
      ],
    }
    expect(toRollResult(view)).toEqual({ dice: '1d20', rolls: [15], modifier: 2, total: 17 })
  })

  it('handles a roll with no modifier', () => {
    const view: RollResultView = {
      label: '1d20',
      total: 12,
      mode: 'normal',
      dice: [{ sides: 20, value: 12 }],
    }
    expect(toRollResult(view)).toEqual({ dice: '1d20', rolls: [12], modifier: 0, total: 12 })
  })
})
