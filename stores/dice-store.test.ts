import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the 3D engine so the store never touches Babylon/Ammo/workers.
vi.mock('@3d-dice/dice-box', () => ({
  default: class {
    constructor() {}
    async init() {}
    async roll(notation: string) {
      if (notation === '2d20') {
        return [{ groupId: 0, rollId: 0, sides: 20, qty: 2, modifier: 0, value: 22,
          rolls: [
            { groupId: 0, rollId: 0, sides: 20, value: 7 },
            { groupId: 0, rollId: 1, sides: 20, value: 15 },
          ] }]
      }
      return [{ groupId: 0, rollId: 0, sides: 6, qty: 1, modifier: 0, value: 4,
        rolls: [{ groupId: 0, rollId: 0, sides: 6, value: 4 }] }]
    }
    clear() {}
  },
}))

import { useDiceStore } from '@/stores/dice-store'

beforeEach(() => {
  useDiceStore.setState({
    status: 'idle', reducedMotion: false, lastResult: null, error: null,
    box: null, initPromise: null,
  })
})

describe('dice-store', () => {
  it('initializes the engine to ready', async () => {
    await useDiceStore.getState().init('#x')
    expect(useDiceStore.getState().status).toBe('ready')
    expect(useDiceStore.getState().box).not.toBeNull()
  })

  it('maps a normal roll to a result view', async () => {
    await useDiceStore.getState().init('#x')
    await useDiceStore.getState().roll('1d6')
    const r = useDiceStore.getState().lastResult!
    expect(r.total).toBe(4)
    expect(r.mode).toBe('normal')
    expect(r.dice).toEqual([{ sides: 6, value: 4 }])
  })

  it('resolves advantage from the two d20 dice', async () => {
    await useDiceStore.getState().init('#x')
    await useDiceStore.getState().rollD20('advantage', 5)
    const r = useDiceStore.getState().lastResult!
    expect(r.total).toBe(20) // max(7,15) + 5
    expect(r.mode).toBe('advantage')
    expect(r.dice).toEqual([
      { sides: 20, value: 7, kept: false },
      { sides: 20, value: 15, kept: true },
    ])
  })

  it('uses the local roller when reduced motion is on (engine not called)', async () => {
    await useDiceStore.getState().init('#x')
    const spy = vi.spyOn(useDiceStore.getState().box!, 'roll')
    useDiceStore.setState({ reducedMotion: true })
    await useDiceStore.getState().roll('2d6')
    const r = useDiceStore.getState().lastResult!
    expect(spy).not.toHaveBeenCalled()
    expect(r.dice).toHaveLength(2)
    expect(r.total).toBeGreaterThanOrEqual(2)
    expect(r.total).toBeLessThanOrEqual(12)
  })

  it('clear() removes the last result', async () => {
    await useDiceStore.getState().init('#x')
    await useDiceStore.getState().roll('1d6')
    useDiceStore.getState().clear()
    expect(useDiceStore.getState().lastResult).toBeNull()
  })
})
