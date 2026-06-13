'use client'

import { useEffect } from 'react'
import { useDiceStore } from '@/stores/dice-store'
import { RollResult } from '@/components/dice/roll-result'

export function DiceTray() {
  const init = useDiceStore((s) => s.init)
  const setReducedMotion = useDiceStore((s) => s.setReducedMotion)
  const lastResult = useDiceStore((s) => s.lastResult)
  const clear = useDiceStore((s) => s.clear)

  // Init the engine once and track the reduced-motion preference.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    void init('#dice-overlay-canvas')
    return () => mq.removeEventListener('change', onChange)
  }, [init, setReducedMotion])

  // Dismiss on Escape or after a short timeout.
  useEffect(() => {
    if (!lastResult) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clear()
    }
    window.addEventListener('keydown', onKey)
    const timer = setTimeout(clear, 6000)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(timer)
    }
  }, [lastResult, clear])

  return (
    <>
      {/* dice-box mounts its canvas here; decorative + non-blocking. */}
      <div
        id="dice-overlay-canvas"
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-40"
      />
      <RollResult result={lastResult} onDismiss={clear} />
    </>
  )
}
