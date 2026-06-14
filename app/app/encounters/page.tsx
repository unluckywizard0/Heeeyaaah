import type { Metadata } from 'next'
import { EncounterCalculator } from '@/components/encounters/encounter-calculator'

export const metadata: Metadata = {
  title: 'Encounters',
}

export default function EncountersPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
          Encounter Calculator
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--foreground-muted)' }}>
          Size a fight with the 2024 DMG XP budget. Set your party and add monsters by challenge rating to see the difficulty.
        </p>
      </header>

      <EncounterCalculator />
    </div>
  )
}
