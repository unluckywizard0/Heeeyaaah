import {
  XP_BUDGET_PER_CHARACTER,
  monsterXpForCr,
  type XpBudget,
} from './xp-tables'

// A group of identical party members ("3 characters at level 5") and a group of
// identical monsters ("2 of CR 1/4"). Encounters are described as lists of these.
export interface PartyGroup {
  level: number
  count: number
}

export interface MonsterGroup {
  cr: number
  count: number
}

// 2024 difficulty bands. 'none' is an empty encounter; 'deadly' is anything that
// overspends the High budget (the 2024 DMG stops at High, but exceeding it is the
// signal a DM most wants, so we surface it explicitly).
export type EncounterRating = 'none' | 'low' | 'moderate' | 'high' | 'deadly'

export interface EncounterAssessment {
  totalXp: number
  budget: XpBudget
  rating: EncounterRating
  /** totalXp as a fraction of the High budget (0 when the party is empty). */
  fractionOfHigh: number
}

/** Sum the party's XP budget at each difficulty (per-character budget × count). */
export function partyBudget(party: PartyGroup[]): XpBudget {
  return party.reduce<XpBudget>(
    (acc, { level, count }) => {
      const row = XP_BUDGET_PER_CHARACTER[level]
      if (!row || count <= 0) return acc
      return {
        low: acc.low + row.low * count,
        moderate: acc.moderate + row.moderate * count,
        high: acc.high + row.high * count,
      }
    },
    { low: 0, moderate: 0, high: 0 }
  )
}

/** Total monster XP. No 2014-style multiplier — 2024 sums raw XP. */
export function encounterXp(monsters: MonsterGroup[]): number {
  return monsters.reduce(
    (sum, { cr, count }) => sum + monsterXpForCr(cr) * Math.max(0, count),
    0
  )
}

/** Where the monster XP lands against the party's three budgets. */
export function rateEncounter(
  party: PartyGroup[],
  monsters: MonsterGroup[]
): EncounterAssessment {
  const budget = partyBudget(party)
  const totalXp = encounterXp(monsters)

  let rating: EncounterRating
  if (totalXp <= 0) rating = 'none'
  else if (totalXp <= budget.low) rating = 'low'
  else if (totalXp <= budget.moderate) rating = 'moderate'
  else if (totalXp <= budget.high) rating = 'high'
  else rating = 'deadly'

  return {
    totalXp,
    budget,
    rating,
    fractionOfHigh: budget.high > 0 ? totalXp / budget.high : 0,
  }
}
