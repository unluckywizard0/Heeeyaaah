import type { CombatCreature } from '@/lib/types/dnd'
import { deathSaveOutcome } from '@/lib/combat/vitals'
import { hpPercent, isDown, isBloodied, summarizeParty } from '@/lib/combat/party'

/**
 * At-a-glance panel of the player party's live HP and conditions, for the DM to
 * read off without scanning the full initiative list. Read-only — every action
 * still happens through the tracker / Vitals popover. Renders nothing when the
 * encounter has no player combatants.
 */
export function PartyOverview({ creatures }: { creatures: CombatCreature[] }) {
  const players = creatures.filter((c) => c.is_player)
  if (players.length === 0) return null

  const summary = summarizeParty(creatures)

  return (
    <section
      className="rounded-lg border p-4 space-y-3"
      style={{ borderColor: 'var(--border)', background: 'var(--background-surface)' }}
      aria-label="Party overview"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--foreground-muted)' }}>
          Party
        </h2>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--foreground-muted)' }}>
          {summary.bloodied > 0 && <Tag color="var(--accent-gold)">{summary.bloodied} bloodied</Tag>}
          {summary.dying > 0 && <Tag color="#f87171">{summary.dying} dying</Tag>}
          {summary.dead > 0 && <Tag color="#f87171">{summary.dead} dead</Tag>}
          {summary.bloodied === 0 && summary.dying === 0 && summary.dead === 0 && (
            <span>All steady</span>
          )}
        </div>
      </div>

      <ul role="list" className="space-y-2">
        {players.map((p) => (
          <PartyRow key={p.id} creature={p} />
        ))}
      </ul>
    </section>
  )
}

function PartyRow({ creature }: { creature: CombatCreature }) {
  const down = isDown(creature)
  const pct = hpPercent(creature.hp_current, creature.hp_max)
  const barColor = down ? '#f87171' : isBloodied(creature) ? 'var(--accent-gold)' : '#4ade80'
  const death = down
    ? deathSaveOutcome({
        successes: creature.death_save_successes,
        failures: creature.death_save_failures,
      })
    : null

  return (
    <li className="rounded-md p-2" style={{ background: 'var(--background)', opacity: down ? 0.75 : 1 }}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-medium" style={{ color: 'var(--foreground)' }}>
          {creature.name}
          {creature.concentration && (
            <span className="text-xs" style={{ color: 'var(--accent-gold)' }} title="Concentrating">
              ◇ conc.
            </span>
          )}
          {death && (
            <span
              className="rounded px-1.5 py-0.5 text-xs font-semibold"
              style={{
                background: 'var(--background-elevated)',
                color: death === 'dead' ? '#f87171' : death === 'stable' ? '#4ade80' : 'var(--accent-gold)',
              }}
            >
              {death === 'dead' ? 'Dead' : death === 'stable' ? 'Stable' : 'Dying'}
            </span>
          )}
        </span>
        <span className="text-xs tabular-nums" style={{ color: 'var(--foreground-muted)' }}>
          {creature.hp_current}/{creature.hp_max}
          {creature.temp_hp > 0 && (
            <span style={{ color: 'var(--accent-gold)' }}> +{creature.temp_hp}</span>
          )}
        </span>
      </div>

      <div
        className="mt-1.5 h-2 w-full overflow-hidden rounded-full"
        style={{ background: 'var(--background-elevated)' }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${creature.name} HP`}
      >
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
      </div>

      {creature.conditions.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
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
    </li>
  )
}

function Tag({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className="rounded px-1.5 py-0.5 font-medium" style={{ background: 'var(--background-elevated)', color }}>
      {children}
    </span>
  )
}
