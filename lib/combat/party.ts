// Pure party-overview helpers for the DM's at-a-glance panel (KAN-17): given the
// encounter's combatants, summarize the player party's live HP and status.
// Side-effect free so the rules are unit-tested in isolation; the page just
// renders the result.

import type { CombatCreature } from '@/lib/types/dnd'
import { deathSaveOutcome } from '@/lib/combat/vitals'

/** Current HP as a 0–100 percentage of max (temp HP excluded). Guards max ≤ 0. */
export function hpPercent(current: number, max: number): number {
  if (max <= 0) return 0
  const pct = (current / max) * 100
  return Math.max(0, Math.min(100, Math.round(pct)))
}

/** A creature is down once its HP hits zero. */
export function isDown(creature: Pick<CombatCreature, 'hp_current'>): boolean {
  return creature.hp_current <= 0
}

/** "Bloodied" — at or below half HP but still standing (classic at-the-table cue). */
export function isBloodied(creature: Pick<CombatCreature, 'hp_current' | 'hp_max'>): boolean {
  return creature.hp_current > 0 && creature.hp_current * 2 <= creature.hp_max
}

export interface PartySummary {
  /** Player combatants in the encounter. */
  total: number
  /** Up and above half HP. */
  healthy: number
  /** Up but at or below half HP. */
  bloodied: number
  /** At 0 HP and still making death saves (not yet stable or dead). */
  dying: number
  /** At 0 HP, three failed death saves. */
  dead: number
}

/** Roll up the player party's status for the overview header. Non-players are ignored. */
export function summarizeParty(creatures: CombatCreature[]): PartySummary {
  const summary: PartySummary = { total: 0, healthy: 0, bloodied: 0, dying: 0, dead: 0 }

  for (const c of creatures) {
    if (!c.is_player) continue
    summary.total++

    if (isDown(c)) {
      const outcome = deathSaveOutcome({
        successes: c.death_save_successes,
        failures: c.death_save_failures,
      })
      // 'stable' creatures are down but no longer rolling — they don't need an
      // alert, so they only count toward the total.
      if (outcome === 'dead') summary.dead++
      else if (outcome === 'dying') summary.dying++
    } else if (isBloodied(c)) {
      summary.bloodied++
    } else {
      summary.healthy++
    }
  }

  return summary
}
