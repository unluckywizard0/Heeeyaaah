// Pure combat-vitals helpers for the tracker (KAN-20): damage/healing with
// temp HP, concentration save DC, condition-timer ticking, and death saves.
// Kept side-effect free so the rules are unit-tested in isolation; the server
// actions just persist the results.

import type { ConditionTimers } from '@/lib/types/dnd'

export interface HpState {
  hp_current: number
  temp_hp: number
}

/**
 * Apply damage. Temp HP soaks first (and doesn't stack — it's already the
 * single highest pool by the time it's stored). HP floors at 0.
 */
export function applyDamage(state: HpState, amount: number): HpState {
  const dmg = Math.max(0, Math.floor(amount))
  const fromTemp = Math.min(state.temp_hp, dmg)
  const remainder = dmg - fromTemp
  return {
    temp_hp: state.temp_hp - fromTemp,
    hp_current: Math.max(0, state.hp_current - remainder),
  }
}

/** Heal up to max HP. Healing never touches temp HP and never exceeds max. */
export function applyHealing(state: HpState, amount: number, hpMax: number): HpState {
  const heal = Math.max(0, Math.floor(amount))
  return { ...state, hp_current: Math.min(hpMax, state.hp_current + heal) }
}

/**
 * Set temp HP. Temp HP doesn't stack — taking a new source means keeping the
 * larger of the two pools (PHB rule), which is what the UI offers.
 */
export function setTempHp(state: HpState, value: number): HpState {
  return { ...state, temp_hp: Math.max(0, Math.floor(value)) }
}

/**
 * Concentration save DC when a concentrating creature takes damage:
 * DC 10 or half the damage taken, whichever is higher.
 */
export function concentrationDc(damage: number): number {
  return Math.max(10, Math.floor(Math.max(0, damage) / 2))
}

/**
 * Whether taking `damage` should prompt a concentration check: only when the
 * creature is currently concentrating and actually took damage.
 */
export function shouldPromptConcentration(concentrating: boolean, damage: number): boolean {
  return concentrating && damage > 0
}

export interface ConditionTickResult {
  timers: ConditionTimers
  /** Conditions whose timer hit zero and should be cleared. */
  expired: string[]
}

/**
 * Decrement every condition timer by one round. Timers reaching zero are
 * dropped and reported in `expired` so the caller can also pull them from the
 * creature's active `conditions` array.
 */
export function tickConditionTimers(timers: ConditionTimers): ConditionTickResult {
  const next: ConditionTimers = {}
  const expired: string[] = []
  for (const [name, rounds] of Object.entries(timers)) {
    const left = rounds - 1
    if (left <= 0) expired.push(name)
    else next[name] = left
  }
  return { timers: next, expired }
}

export type DeathSaveOutcome = 'dying' | 'stable' | 'dead'

export interface DeathSaveState {
  successes: number
  failures: number
}

/** Classify death-save progress: 3 successes stabilises, 3 failures kills. */
export function deathSaveOutcome(state: DeathSaveState): DeathSaveOutcome {
  if (state.failures >= 3) return 'dead'
  if (state.successes >= 3) return 'stable'
  return 'dying'
}
