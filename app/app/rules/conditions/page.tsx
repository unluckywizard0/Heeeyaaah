import type { Metadata } from 'next'
import { ConditionBrowser } from '@/components/rules/condition-browser'

export const metadata: Metadata = {
  title: 'Conditions',
}

export default function ConditionsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
          Conditions
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--foreground-muted)' }}>
          Click a condition for the full rules text.
        </p>
      </header>

      <ConditionBrowser />
    </div>
  )
}
