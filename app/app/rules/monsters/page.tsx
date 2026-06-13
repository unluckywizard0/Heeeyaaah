import type { Metadata } from 'next'
import { MonsterBrowser } from '@/components/rules/monster-browser'

export const metadata: Metadata = {
  title: 'Monsters',
}

export default function MonstersPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
          Monsters
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--foreground-muted)' }}>
          Filter by edition, challenge rating, and type. Click a monster for the full stat block.
        </p>
      </header>

      <MonsterBrowser />
    </div>
  )
}
