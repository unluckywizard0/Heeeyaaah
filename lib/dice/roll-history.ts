import type { RollResultView } from '@/stores/dice-store'
import type { RollResult } from '@/lib/types/dnd'

/**
 * Convert a dice-store result into the `roll_history.results` storage shape
 * (KAN-16). Dropped d20s (advantage/disadvantage) are excluded from `rolls`;
 * the modifier is recovered as whatever's left after summing the kept dice.
 */
export function toRollResult(view: RollResultView): RollResult {
  const kept = view.dice.filter((d) => d.kept !== false)
  const rolls = kept.map((d) => d.value)
  const sides = kept[0]?.sides ?? 20
  const modifier = view.total - rolls.reduce((sum, v) => sum + v, 0)
  return {
    dice: `${rolls.length}d${sides}`,
    rolls,
    modifier,
    total: view.total,
  }
}
