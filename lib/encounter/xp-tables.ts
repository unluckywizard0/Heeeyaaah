// 2024 Dungeon Master's Guide encounter-building data.
//
// The 2024 rules replaced the 2014 four-tier thresholds (easy/medium/hard/deadly)
// + the "encounter multiplier" for monster count with a single XP budget per
// character at three difficulties (Low/Moderate/High). To size an encounter you
// sum each character's budget, then spend it on monster XP with NO multiplier.

export type Difficulty = 'low' | 'moderate' | 'high'

export interface XpBudget {
  low: number
  moderate: number
  high: number
}

// XP Budget per Character (2024 DMG). Multiply a row by the party size.
// Anchored against published values: L1 50/75/100, L10 1600/2300/3100,
// L15 high 7800, L20 6400/13200/22000.
export const XP_BUDGET_PER_CHARACTER: Record<number, XpBudget> = {
  1: { low: 50, moderate: 75, high: 100 },
  2: { low: 100, moderate: 150, high: 200 },
  3: { low: 150, moderate: 225, high: 400 },
  4: { low: 250, moderate: 375, high: 500 },
  5: { low: 500, moderate: 750, high: 1100 },
  6: { low: 600, moderate: 1000, high: 1400 },
  7: { low: 750, moderate: 1300, high: 1700 },
  8: { low: 1000, moderate: 1700, high: 2100 },
  9: { low: 1300, moderate: 2000, high: 2600 },
  10: { low: 1600, moderate: 2300, high: 3100 },
  11: { low: 1900, moderate: 2900, high: 4100 },
  12: { low: 2200, moderate: 3700, high: 4700 },
  13: { low: 2600, moderate: 4200, high: 5400 },
  14: { low: 2900, moderate: 4900, high: 6200 },
  15: { low: 3300, moderate: 5400, high: 7800 },
  16: { low: 3800, moderate: 6100, high: 9800 },
  17: { low: 4500, moderate: 7200, high: 11700 },
  18: { low: 5000, moderate: 8700, high: 14200 },
  19: { low: 5500, moderate: 10700, high: 17200 },
  20: { low: 6400, moderate: 13200, high: 22000 },
}

// Experience Points by Challenge Rating. Unchanged between 2014 and 2024.
// Keyed by CR as a number (fractions for CR 1/8, 1/4, 1/2).
export const MONSTER_XP_BY_CR: Record<number, number> = {
  0: 10,
  0.125: 25,
  0.25: 50,
  0.5: 100,
  1: 200,
  2: 450,
  3: 700,
  4: 1100,
  5: 1800,
  6: 2300,
  7: 2900,
  8: 3900,
  9: 5000,
  10: 5900,
  11: 7200,
  12: 8400,
  13: 10000,
  14: 11500,
  15: 13000,
  16: 15000,
  17: 18000,
  18: 20000,
  19: 22000,
  20: 25000,
  21: 33000,
  22: 41000,
  23: 50000,
  24: 62000,
  25: 75000,
  26: 90000,
  27: 105000,
  28: 120000,
  29: 135000,
  30: 155000,
}

/** CR values in ascending order — handy for building selectors. */
export const CR_VALUES: number[] = Object.keys(MONSTER_XP_BY_CR)
  .map(Number)
  .sort((a, b) => a - b)

/** XP awarded for a monster of the given CR, or 0 if the CR is unknown. */
export function monsterXpForCr(cr: number): number {
  return MONSTER_XP_BY_CR[cr] ?? 0
}

/** Display a CR the way players read it (fractions below 1). */
export function formatCrValue(cr: number): string {
  if (cr === 0.125) return '1/8'
  if (cr === 0.25) return '1/4'
  if (cr === 0.5) return '1/2'
  return String(cr)
}
