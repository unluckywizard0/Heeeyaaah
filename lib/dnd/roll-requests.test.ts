import { describe, expect, it } from 'vitest'
import {
  ABILITIES,
  SKILLS,
  rollRequestLabel,
  evaluateAgainstDc,
  isTargeted,
  hasResponded,
  pendingRequestsForPlayer,
} from './roll-requests'

describe('reference data', () => {
  it('has the six abilities and eighteen skills', () => {
    expect(ABILITIES).toHaveLength(6)
    expect(SKILLS).toHaveLength(18)
  })

  it('points every skill at a real ability', () => {
    const abilityKeys = new Set(ABILITIES.map((a) => a.key))
    for (const skill of SKILLS) {
      expect(abilityKeys.has(skill.ability)).toBe(true)
    }
  })
})

describe('rollRequestLabel', () => {
  it('includes the DC and the right noun for a save', () => {
    expect(rollRequestLabel('save', 'Dexterity', 15)).toBe('DC 15 Dexterity save')
  })

  it('omits the DC when not set', () => {
    expect(rollRequestLabel('check', 'Perception')).toBe('Perception check')
    expect(rollRequestLabel('check', 'Perception', null)).toBe('Perception check')
  })
})

describe('evaluateAgainstDc', () => {
  it('passes on meeting or exceeding the DC', () => {
    expect(evaluateAgainstDc(15, 15)).toBe('pass')
    expect(evaluateAgainstDc(20, 15)).toBe('pass')
  })

  it('fails below the DC', () => {
    expect(evaluateAgainstDc(14, 15)).toBe('fail')
  })

  it('returns null when there is no DC', () => {
    expect(evaluateAgainstDc(10, null)).toBeNull()
    expect(evaluateAgainstDc(10, undefined)).toBeNull()
  })
})

describe('targeting & responses', () => {
  const partyReq = { id: 'r1', target_user_id: null, is_open: true }
  const soloReq = { id: 'r2', target_user_id: 'u2', is_open: true }
  const closedReq = { id: 'r3', target_user_id: null, is_open: false }

  it('treats a null target as the whole party', () => {
    expect(isTargeted(partyReq, 'u1')).toBe(true)
    expect(isTargeted(partyReq, 'u2')).toBe(true)
  })

  it('targets only the named player for a solo request', () => {
    expect(isTargeted(soloReq, 'u2')).toBe(true)
    expect(isTargeted(soloReq, 'u1')).toBe(false)
  })

  it('detects whether a user has responded', () => {
    const responses = [{ request_id: 'r1', user_id: 'u1' }]
    expect(hasResponded('r1', 'u1', responses)).toBe(true)
    expect(hasResponded('r1', 'u2', responses)).toBe(false)
  })

  it('returns only open, targeted, unanswered requests for a player', () => {
    const requests = [partyReq, soloReq, closedReq]
    const responses = [{ request_id: 'r1', user_id: 'u1' }]
    // u1 already answered r1, isn't targeted by r2 (solo u2), r3 is closed.
    expect(pendingRequestsForPlayer(requests, responses, 'u1')).toEqual([])
    // u2 is targeted by both r1 (party) and r2 (solo), hasn't answered either.
    expect(pendingRequestsForPlayer(requests, responses, 'u2').map((r) => r.id)).toEqual(['r1', 'r2'])
  })
})
