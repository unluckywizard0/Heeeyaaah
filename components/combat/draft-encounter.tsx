'use client'

import { useActionState } from 'react'
import type { CombatCreature, CombatEncounter } from '@/lib/types/dnd'
import { removeCombatantAction, rollInitiativeAction, setInitiativeAction, startCombatAction, type ActionState } from '@/lib/actions/combat'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AddCombatantForm } from '@/components/combat/add-combatant-form'

const initialState: ActionState = {}

export function DraftEncounter({
  encounter,
  creatures,
}: {
  encounter: CombatEncounter
  creatures: CombatCreature[]
}) {
  return (
    <div
      className="rounded-lg border p-5 space-y-5"
      style={{ borderColor: 'var(--border)', background: 'var(--background-surface)' }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--foreground-muted)' }}>
          {encounter.name} — setting up
        </h2>
        <form action={async () => { await startCombatAction(encounter.id) }}>
          <Button type="submit" disabled={creatures.length === 0}>
            Roll initiative &amp; start
          </Button>
        </form>
      </div>

      {creatures.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
          Add combatants below, then start combat to sort them by initiative.
        </p>
      ) : (
        <ul role="list" className="space-y-2">
          {creatures.map((c) => (
            <DraftRow key={c.id} creature={c} />
          ))}
        </ul>
      )}

      <AddCombatantForm encounterId={encounter.id} />
    </div>
  )
}

function DraftRow({ creature }: { creature: CombatCreature }) {
  const [state, formAction, pending] = useActionState(setInitiativeAction, initialState)

  return (
    <li
      className="flex items-center gap-3 rounded-lg border p-3"
      style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
    >
      <span className="flex-1 font-medium" style={{ color: 'var(--foreground)' }}>
        {creature.name}
        {creature.is_player && (
          <span className="ml-2 rounded px-1.5 py-0.5 text-xs" style={{ background: 'var(--background-elevated)', color: 'var(--accent-gold)' }}>
            player
          </span>
        )}
      </span>
      <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
        AC {creature.ac} · HP {creature.hp_max} · DEX {creature.dex_mod >= 0 ? '+' : ''}{creature.dex_mod}
      </span>

      <form action={async () => { await rollInitiativeAction(creature.id, creature.dex_mod) }} className="flex items-center gap-2">
        <Button type="submit" variant="outline" size="sm">
          🎲 Roll
        </Button>
      </form>

      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="creature_id" value={creature.id} />
        <Input
          name="initiative"
          type="number"
          defaultValue={creature.initiative ?? ''}
          placeholder="Init"
          disabled={pending}
          className="w-16"
          aria-label={`Initiative for ${creature.name}`}
        />
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          Set
        </Button>
      </form>

      <form action={async () => { await removeCombatantAction(creature.id) }}>
        <Button type="submit" variant="ghost" size="sm" aria-label={`Remove ${creature.name}`}>
          ✕
        </Button>
      </form>

      {state.error && (
        <span role="alert" className="text-xs" style={{ color: '#e74c3c' }}>
          {state.error}
        </span>
      )}
    </li>
  )
}
