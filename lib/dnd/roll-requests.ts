// KAN-49 — DM roll requests & group checks.
//
// Pure helpers + reference data for building a roll request and reconciling the
// responses that come back as roll_history rows. No I/O here so it stays unit
// testable; the server actions and components wrap these.

export type CheckKind = 'check' | 'save'

export interface AbilityDef {
  key: string
  label: string
}

export interface SkillDef {
  key: string
  label: string
  ability: string
}

/** The six ability scores, used for saving throws and as skill parents. */
export const ABILITIES: AbilityDef[] = [
  { key: 'str', label: 'Strength' },
  { key: 'dex', label: 'Dexterity' },
  { key: 'con', label: 'Constitution' },
  { key: 'int', label: 'Intelligence' },
  { key: 'wis', label: 'Wisdom' },
  { key: 'cha', label: 'Charisma' },
]

/** The 18 standard 5e skills with their governing ability. */
export const SKILLS: SkillDef[] = [
  { key: 'acrobatics', label: 'Acrobatics', ability: 'dex' },
  { key: 'animal-handling', label: 'Animal Handling', ability: 'wis' },
  { key: 'arcana', label: 'Arcana', ability: 'int' },
  { key: 'athletics', label: 'Athletics', ability: 'str' },
  { key: 'deception', label: 'Deception', ability: 'cha' },
  { key: 'history', label: 'History', ability: 'int' },
  { key: 'insight', label: 'Insight', ability: 'wis' },
  { key: 'intimidation', label: 'Intimidation', ability: 'cha' },
  { key: 'investigation', label: 'Investigation', ability: 'int' },
  { key: 'medicine', label: 'Medicine', ability: 'wis' },
  { key: 'nature', label: 'Nature', ability: 'int' },
  { key: 'perception', label: 'Perception', ability: 'wis' },
  { key: 'performance', label: 'Performance', ability: 'cha' },
  { key: 'persuasion', label: 'Persuasion', ability: 'cha' },
  { key: 'religion', label: 'Religion', ability: 'int' },
  { key: 'sleight-of-hand', label: 'Sleight of Hand', ability: 'dex' },
  { key: 'stealth', label: 'Stealth', ability: 'dex' },
  { key: 'survival', label: 'Survival', ability: 'wis' },
]

/**
 * Human-readable label for a request, e.g. "DC 15 Dexterity save" or
 * "Perception check". DC is omitted when not set (a blind/passive ask).
 */
export function rollRequestLabel(kind: CheckKind, subjectLabel: string, dc?: number | null): string {
  const noun = kind === 'save' ? 'save' : 'check'
  const prefix = typeof dc === 'number' ? `DC ${dc} ` : ''
  return `${prefix}${subjectLabel} ${noun}`
}

/** A roll's outcome against a DC: pass/fail, or null when the request has no DC. */
export function evaluateAgainstDc(total: number, dc: number | null | undefined): 'pass' | 'fail' | null {
  if (typeof dc !== 'number') return null
  return total >= dc ? 'pass' : 'fail'
}

interface RequestLike {
  id: string
  target_user_id: string | null
  is_open: boolean
}

interface ResponseLike {
  request_id: string | null
  user_id: string
}

/** True when `userId` is being asked (directly or as part of the party). */
export function isTargeted(request: RequestLike, userId: string): boolean {
  return request.target_user_id === null || request.target_user_id === userId
}

/** True when `userId` has already answered the given request. */
export function hasResponded(
  requestId: string,
  userId: string,
  responses: ResponseLike[],
): boolean {
  return responses.some((r) => r.request_id === requestId && r.user_id === userId)
}

/**
 * Open requests `userId` is targeted by and hasn't answered yet — the prompts a
 * player still needs to act on.
 */
export function pendingRequestsForPlayer<T extends RequestLike>(
  requests: T[],
  responses: ResponseLike[],
  userId: string,
): T[] {
  return requests.filter(
    (req) => req.is_open && isTargeted(req, userId) && !hasResponded(req.id, userId, responses),
  )
}
