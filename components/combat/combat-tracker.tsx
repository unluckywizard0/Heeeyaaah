'use client'

import type { CombatCreature, CombatEncounter } from '@/lib/types/dnd'
import {
  delayTurnAction,
  endEncounterAction,
  nextTurnAction,
  readyActionAction,
  removeCombatantAction,
  toggleHoldAction,
} from '@/lib/actions/combat'
import { Button } from '@/components/ui/button'
import { AddCombatantForm } from '@/components/combat/add-combatant-form'

export function CombatTracker({
  encounter,
  creatures,
  isDm,
}: {
  encounter: CombatEncounter
  creatures: CombatCreature[]
  isDm: boolean
}) {
  const byId = new Map(creatures.map((c) => [c.id, c]))
  const order = encounter.initiative_order
    .map((id) => byId.get(id))
    .filter((c): c is CombatCreature => !!c)
  const currentId = order[encounter.current_turn_index]?.id

  return (
    <div
      className="rounded-lg border p-5 space-y-5"
      style={{ borderColor: 'var(--border)', background: 'var(--background-surface)' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--foreground-muted)' }}>
            {encounter.name}
          </h2>
          <p className="mt-1 text-2xl font-bold" style={{ color: 'var(--accent-gold)' }}>
            Round {encounter.round_number}
          </p>
        </div>
        {isDm && (
          <div className="flex gap-2">
            <form action={async () => { await delayTurnAction(encounter.id) }}>
              <Button type="submit" variant="outline">
                Delay
              </Button>
            </form>
            <form action={async () => { await nextTurnAction(encounter.id) }}>
              <Button type="submit">Next turn →</Button>
            </form>
            <form action={async () => { await endEncounterAction(encounter.id) }}>
              <Button type="submit" variant="ghost">
                End combat
              </Button>
            </form>
          </div>
        )}
      </div>

      <ol role="list" className="space-y-2">
        {order.map((creature) => (
          <TurnRow
            key={creature.id}
            creature={creature}
            isCurrent={creature.id === currentId}
            isDm={isDm}
            encounterId={encounter.id}
          />
        ))}
      </ol>

      {isDm && <AddCombatantForm encounterId={encounter.id} />}
    </div>
  )
}

function TurnRow({
  creature,
  isCurrent,
  isDm,
  encounterId,
}: {
  creature: CombatCreature
  isCurrent: boolean
  isDm: boolean
  encounterId: string
}) {
  return (
    <li
      className="flex items-center gap-3 rounded-lg border p-3"
      style={{
        borderColor: isCurrent ? 'var(--accent-gold)' : 'var(--border)',
        background: isCurrent ? 'var(--background-elevated)' : 'var(--background)',
      }}
      aria-current={isCurrent ? 'true' : undefined}
    >
      <span
        className="w-10 text-center text-sm font-bold"
        style={{ color: 'var(--foreground-muted)' }}
        aria-label="Initiative"
      >
        {creature.initiative ?? '—'}
      </span>

      <span className="flex-1 font-medium" style={{ color: 'var(--foreground)' }}>
        {creature.name}
        {creature.is_player && (
          <span className="ml-2 rounded px-1.5 py-0.5 text-xs" style={{ background: 'var(--background-elevated)', color: 'var(--accent-gold)' }}>
            player
          </span>
        )}
        {isCurrent && (
          <span className="ml-2 rounded px-1.5 py-0.5 text-xs font-semibold" style={{ background: 'var(--accent-gold)', color: 'var(--background)' }}>
            current turn
          </span>
        )}
        {creature.turn_status === 'delayed' && (
          <span className="ml-2 text-xs" style={{ color: 'var(--foreground-muted)' }}>
            (delaying)
          </span>
        )}
        {creature.turn_status === 'holding' && (
          <span className="ml-2 text-xs" style={{ color: 'var(--foreground-muted)' }}>
            (holding)
          </span>
        )}
      </span>

      <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
        AC {creature.ac} · HP {creature.hp_current}/{creature.hp_max}
      </span>

      {isDm && (
        <>
          <form action={async () => { await toggleHoldAction(creature.id, creature.turn_status) }}>
            <Button type="submit" variant="outline" size="sm">
              {creature.turn_status === 'holding' ? 'Stop holding' : 'Hold'}
            </Button>
          </form>
          {creature.turn_status === 'holding' && (
            <form action={async () => { await readyActionAction(encounterId, creature.id) }}>
              <Button type="submit" variant="outline" size="sm">
                React now
              </Button>
            </form>
          )}
          <form action={async () => { await removeCombatantAction(creature.id) }}>
            <Button type="submit" variant="ghost" size="sm" aria-label={`Remove ${creature.name}`}>
              ✕
            </Button>
          </form>
        </>
      )}
    </li>
  )
}
