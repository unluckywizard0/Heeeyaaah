// Pure action-economy helpers for the tracker (KAN-22): the action / bonus
// action / reaction slots plus movement spent, all per combatant per turn.
// Side-effect free so the rules are unit-tested in isolation; the server
// actions just persist the results.

import type { ActionEconomy } from '@/lib/types/dnd'

/** The three on/off slots a creature spends in a turn (movement is tracked separately). */
export type ActionSlot = 'action' | 'bonus_action' | 'reaction'

/**
 * A fresh turn: every slot available (`true`) and no movement spent. The DB
 * column defaults to this too, so it doubles as the fallback when a row predates
 * the column.
 */
export const FRESH_ECONOMY: ActionEconomy = {
  action: true,
  bonus_action: true,
  reaction: true,
  movement_used: 0,
}

/** Reset to a fresh turn — all slots available, movement zeroed. */
export function resetEconomy(): ActionEconomy {
  return { ...FRESH_ECONOMY }
}

/** Flip one slot between available (`true`) and spent (`false`). */
export function toggleSlot(economy: ActionEconomy, slot: ActionSlot): ActionEconomy {
  return { ...economy, [slot]: !economy[slot] }
}

/** Set movement spent this turn in feet, clamped to a whole number ≥ 0. */
export function setMovementUsed(economy: ActionEconomy, feet: number): ActionEconomy {
  return { ...economy, movement_used: Math.max(0, Math.floor(feet)) }
}
