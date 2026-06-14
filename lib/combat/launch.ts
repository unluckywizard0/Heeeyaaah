// Pure helpers for launching an encounter calculator configuration into the
// combat tracker (KAN-27). Expands monster groups (CR + count) into individual
// combatant drafts using the CR-based AC/HP defaults; the server action persists
// the result as combat_creatures rows. Linking the campaign's player characters
// is a follow-up once the character sheet (KAN-13) lands.

import type { MonsterGroup } from '@/lib/encounter/difficulty'
import { crDefaults } from '@/lib/encounter/cr-defaults'
import { formatCrValue } from '@/lib/encounter/xp-tables'

export interface CombatantDraft {
  name: string
  dex_mod: number
  hp_current: number
  hp_max: number
  ac: number
  is_player: boolean
}

/**
 * Expand monster groups into one draft combatant per monster, named
 * "CR {cr} Monster {n}" so duplicates within a group are distinguishable.
 * dex_mod defaults to 0 (no stat block yet) — the DM can roll/adjust initiative
 * once combat starts.
 */
export function monsterCombatantDrafts(monsters: MonsterGroup[]): CombatantDraft[] {
  const drafts: CombatantDraft[] = []
  for (const { cr, count } of monsters) {
    const { ac, hp } = crDefaults(cr)
    for (let i = 1; i <= Math.max(0, Math.floor(count)); i++) {
      drafts.push({
        name: `CR ${formatCrValue(cr)} Monster ${i}`,
        dex_mod: 0,
        hp_current: hp,
        hp_max: hp,
        ac,
        is_player: false,
      })
    }
  }
  return drafts
}
