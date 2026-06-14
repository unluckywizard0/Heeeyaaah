// Pure turn-order helpers for the combat tracker (KAN-19).
//
// `initiative_order` is a snapshot of combatant ids captured when combat
// starts; it is NOT re-derived from `initiative` on every turn, because
// re-sorting mid-round would silently reshuffle whose turn it is. Delay
// and ready/hold mutate this array directly instead.

export interface InitiativeEntry {
  id: string
  initiative: number | null
}

/** Sort by initiative descending (ties broken by input order) for combat start. */
export function sortByInitiative(creatures: InitiativeEntry[]): string[] {
  return [...creatures]
    .sort((a, b) => (b.initiative ?? -Infinity) - (a.initiative ?? -Infinity))
    .map((c) => c.id)
}

export interface TurnPointer {
  round_number: number
  current_turn_index: number
}

/** Advance to the next combatant, rolling the round counter on wraparound. */
export function advanceTurn(order: string[], pointer: TurnPointer): TurnPointer {
  if (order.length === 0) return pointer
  const nextIndex = pointer.current_turn_index + 1
  if (nextIndex >= order.length) {
    return { round_number: pointer.round_number + 1, current_turn_index: 0 }
  }
  return { round_number: pointer.round_number, current_turn_index: nextIndex }
}

/**
 * Delay the current combatant: move them to the end of the initiative order
 * for this round. The combatant who was up next now takes their turn, so the
 * turn pointer doesn't move (it now points at that combatant).
 */
export function delayCurrentTurn(order: string[], pointer: TurnPointer): string[] {
  if (order.length < 2) return order
  const i = pointer.current_turn_index
  const next = [...order]
  const [delayed] = next.splice(i, 1)
  next.push(delayed)
  return next
}

/**
 * A holding combatant acts now, out of turn: slot them into the current
 * turn position, pushing whoever was up next back by one. The turn pointer
 * doesn't move, so the readied combatant becomes the current turn.
 */
export function insertReadiedAction(order: string[], pointer: TurnPointer, creatureId: string): string[] {
  const next = order.filter((id) => id !== creatureId)
  next.splice(pointer.current_turn_index, 0, creatureId)
  return next
}
