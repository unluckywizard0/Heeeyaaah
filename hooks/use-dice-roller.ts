'use client'

import { useDiceStore } from '@/stores/dice-store'

/** Public dice API for any feature: roll standard notation or a d20 with advantage/disadvantage. */
export function useDiceRoller() {
  const status = useDiceStore((s) => s.status)
  const lastResult = useDiceStore((s) => s.lastResult)
  const error = useDiceStore((s) => s.error)
  const roll = useDiceStore((s) => s.roll)
  const rollD20 = useDiceStore((s) => s.rollD20)
  const clear = useDiceStore((s) => s.clear)

  return {
    status,
    lastResult,
    error,
    rollNormal: (notation: string) => roll(notation),
    rollAdvantage: (modifier = 0) => rollD20('advantage', modifier),
    rollDisadvantage: (modifier = 0) => rollD20('disadvantage', modifier),
    clear,
  }
}
