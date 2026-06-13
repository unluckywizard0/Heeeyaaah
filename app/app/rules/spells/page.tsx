import type { Metadata } from 'next'
import { SpellBrowser } from '@/components/rules/spell-browser'

export const metadata: Metadata = {
  title: 'Spells',
}

export default function SpellsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
          Spells
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--foreground-muted)' }}>
          Filter by class, level, school, and edition. Click a spell for the full entry.
        </p>
      </header>

      <SpellBrowser />
    </div>
  )
}
