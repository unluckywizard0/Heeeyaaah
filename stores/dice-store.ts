import { create } from 'zustand'
import {
  resolveD20Keep,
  rollLocally,
  totalFromDiceBoxGroups,
  type RollMode,
} from '@/lib/dice/notation'

export type DiceStatus = 'idle' | 'initializing' | 'ready' | 'rolling' | 'error'

export interface RollResultView {
  label: string
  total: number
  dice: { sides: number; value: number; kept?: boolean }[]
  mode: RollMode
}

interface DiceState {
  status: DiceStatus
  reducedMotion: boolean
  lastResult: RollResultView | null
  error: string | null
  // Engine + init guard live in state (not module scope) so tests can reset them.
  box: import('@3d-dice/dice-box').default | null
  initPromise: Promise<void> | null
  init: (containerSelector: string) => Promise<void>
  setReducedMotion: (v: boolean) => void
  roll: (notation: string) => Promise<void>
  rollD20: (mode: 'advantage' | 'disadvantage', modifier: number) => Promise<void>
  clear: () => void
}

export const useDiceStore = create<DiceState>((set, get) => ({
  status: 'idle',
  reducedMotion: false,
  lastResult: null,
  error: null,
  box: null,
  initPromise: null,

  setReducedMotion: (v) => set({ reducedMotion: v }),

  init: async (containerSelector) => {
    const existing = get().initPromise
    if (existing) return existing
    set({ status: 'initializing', error: null })
    const p = (async () => {
      try {
        const { default: DiceBox } = await import('@3d-dice/dice-box')
        const instance = new DiceBox({
          container: containerSelector,
          assetPath: '/assets/dice-box/',
          theme: 'default',
          themeColor: '#c9a84c',
          scale: 6,
        })
        await instance.init()
        set({ box: instance, status: 'ready' })
      } catch (e) {
        set({
          box: null,
          status: 'error',
          error: e instanceof Error ? e.message : 'Dice engine failed to load',
        })
      }
    })()
    set({ initPromise: p })
    return p
  },

  roll: async (notation) => {
    const { reducedMotion, box } = get()
    set({ status: 'rolling', lastResult: null })
    try {
      if (reducedMotion || !box) {
        const r = rollLocally(notation)
        set({
          status: 'ready',
          lastResult: { label: notation, total: r.total, mode: 'normal', dice: r.dice },
        })
        return
      }
      const groups = await box.roll(notation)
      const total = totalFromDiceBoxGroups(groups)
      const dice = groups.flatMap((g) => g.rolls.map((d) => ({ sides: d.sides, value: d.value })))
      set({ status: 'ready', lastResult: { label: notation, total, mode: 'normal', dice } })
    } catch {
      set({ status: 'ready', error: 'Roll failed' })
    }
  },

  rollD20: async (mode, modifier) => {
    const { reducedMotion, box } = get()
    const label = `d20 (${mode === 'advantage' ? 'Advantage' : 'Disadvantage'})${modifier ? `+${modifier}` : ''}`
    set({ status: 'rolling', lastResult: null })
    try {
      let values: number[]
      if (reducedMotion || !box) {
        values = rollLocally('2d20').dice.map((d) => d.value)
      } else {
        const groups = await box.roll('2d20')
        values = groups[0].rolls.map((d) => d.value)
      }
      const { keptIndex, total } = resolveD20Keep(values, mode, modifier)
      const dice = values.map((v, i) => ({ sides: 20, value: v, kept: i === keptIndex }))
      set({ status: 'ready', lastResult: { label, total, mode, dice } })
    } catch {
      set({ status: 'ready', error: 'Roll failed' })
    }
  },

  clear: () => set({ lastResult: null }),
}))
