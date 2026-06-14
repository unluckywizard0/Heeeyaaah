import type { Metadata } from 'next'
import { FeatBrowser } from '@/components/rules/feat-browser'

export const metadata: Metadata = {
  title: 'Feats',
}

export default function FeatsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
          Feats
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--foreground-muted)' }}>
          Filter by edition. Click a feat for the full description.
        </p>
      </header>

      <FeatBrowser />
    </div>
  )
}
