'use client'

import { useState } from 'react'
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
import { CombatantVitals } from '@/components/combat/combatant-vitals'
import { MonsterActionsPanel } from '@/components/combat/monster-actions-panel'
import { AddMonsterCombatant } from '@/components/combat/add-monster-combatant'

export function CombatTracker({
  encounter,
  creatures,
  isDm,
  campaignId,
}: {
  encounter: CombatEncounter
  creatures: CombatCreature[]
  isDm: boolean
  campaignId: string
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
            campaignId={campaignId}
          />
        ))}
      </ol>

      {isDm && (
        <div className="space-y-2">
          <AddCombatantForm encounterId={encounter.id} />
          <AddMonsterCombatant encounterId={encounter.id} />
        </div>
      )}
    </div>
  )
}

function TurnRow({
  creature,
  isCurrent,
  isDm,
  encounterId,
  campaignId,
}: {
  creature: CombatCreature
  isCurrent: boolean
  isDm: boolean
  encounterId: string
  campaignId: string
}) {
  const [showActions, setShowActions] = useState(false)
  const isDown = creature.hp_current <= 0
  const econ = creature.action_economy
  const spentSlots = econ
    ? ([
        ['Action', econ.action],
        ['Bonus', econ.bonus_action],
        ['Reaction', econ.reaction],
      ] as const).filter(([, available]) => !available)
    : []
  const showEconomy = spentSlots.length > 0 || (econ?.movement_used ?? 0) > 0

  return (
    <li
      className="rounded-lg border p-3"
      style={{
        borderColor: isCurrent ? 'var(--accent-gold)' : 'var(--border)',
        background: isCurrent ? 'var(--background-elevated)' : 'var(--background)',
        opacity: isDown ? 0.65 : 1,
      }}
      aria-current={isCurrent ? 'true' : undefined}
    >
      <div className="flex items-center gap-3">
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
          {creature.concentration && (
            <span className="ml-2 text-xs" style={{ color: 'var(--accent-gold)' }} title="Concentrating">
              ◇ conc.
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
          {creature.temp_hp > 0 && (
            <span style={{ color: 'var(--accent-gold)' }}> +{creature.temp_hp}</span>
          )}
        </span>

        {isDm && (
          <>
            {creature.monster_id && (
              <Button type="button" variant="outline" size="sm" onClick={() => setShowActions((v) => !v)}>
                {showActions ? 'Hide actions' : 'Actions'}
              </Button>
            )}
            <CombatantVitals creature={creature} />
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
      </div>

      {creature.conditions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5 pl-13">
          {creature.conditions.map((cond) => {
            const timer = creature.condition_timers?.[cond]
            return (
              <span
                key={cond}
                className="rounded px-1.5 py-0.5 text-xs"
                style={{ background: 'var(--background-elevated)', color: 'var(--foreground-muted)' }}
              >
                {cond}
                {timer ? ` (${timer})` : ''}
              </span>
            )
          })}
        </div>
      )}

      {showEconomy && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-13 text-xs" style={{ color: 'var(--foreground-muted)' }}>
          {spentSlots.map(([label]) => (
            <span
              key={label}
              className="rounded px-1.5 py-0.5"
              style={{ background: 'var(--background-elevated)', textDecoration: 'line-through' }}
            >
              {label}
            </span>
          ))}
          {(econ?.movement_used ?? 0) > 0 && <span>{econ?.movement_used} ft moved</span>}
        </div>
      )}

      {showActions && creature.monster_id && (
        <div className="pl-13">
          <MonsterActionsPanel campaignId={campaignId} creatureName={creature.name} monsterId={creature.monster_id} />
        </div>
      )}
    </li>
  )
}
