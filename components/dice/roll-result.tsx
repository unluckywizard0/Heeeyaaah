'use client'

import type { RollResultView } from '@/stores/dice-store'

export function RollResult({
  result,
  onDismiss,
}: {
  result: RollResultView | null
  onDismiss: () => void
}) {
  if (!result) return null

  return (
    // Click-anywhere-to-dismiss layer; pointer-events enabled only while a result shows.
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-end justify-center pb-28"
      onClick={onDismiss}
    >
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border px-6 py-4 text-center shadow-lg"
        style={{ borderColor: 'var(--border)', background: 'var(--background-surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--foreground-muted)' }}>
          {result.label}
        </p>
        <p className="mt-1 text-4xl font-bold" style={{ color: 'var(--accent-gold)' }}>
          {result.total}
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--foreground)' }}>
          {result.dice.map((d, i) => (
            <span key={i} className={d.kept === false ? 'line-through' : undefined}>
              {d.value}
              {d.kept === false && <span className="sr-only"> (dropped)</span>}
              {i < result.dice.length - 1 ? ', ' : ''}
            </span>
          ))}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-3 inline-flex min-h-[24px] items-center text-xs underline"
          style={{ color: 'var(--foreground-muted)' }}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
