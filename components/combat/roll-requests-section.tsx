import { createClient } from '@/lib/supabase/server'
import type { RollRequest, RollResult } from '@/lib/types/dnd'
import { evaluateAgainstDc, pendingRequestsForPlayer } from '@/lib/dnd/roll-requests'
import { RollRequestForm, type RequestTarget } from '@/components/combat/roll-request-form'
import { RollRequestPrompt } from '@/components/combat/roll-request-prompt'
import { RollRequestRealtime } from '@/components/combat/roll-request-realtime'
import { CloseRequestButton } from '@/components/combat/close-request-button'

interface ResponseRow {
  id: string
  request_id: string | null
  user_id: string
  results: RollResult
}

/**
 * Roll-requests area on the combat page (KAN-49). The DM sees a request form
 * plus a live panel of open asks and their collecting responses; a player sees
 * prompts for the open requests aimed at them. Data is RLS-gated, so each role
 * only ever reads what it's allowed to.
 */
export async function RollRequestsSection({
  campaignId,
  isDm,
}: {
  campaignId: string
  isDm: boolean
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: requestData } = await supabase
    .from('roll_requests')
    .select('id, campaign_id, requested_by, label, kind, dc, target_user_id, is_open, created_at')
    .eq('campaign_id', campaignId)
    .eq('is_open', true)
    .order('created_at', { ascending: false })

  const requests = (requestData ?? []) as RollRequest[]

  // Members → names, and the DM's "who to ask" target list (everyone but the DM).
  const { data: memberData } = await supabase
    .from('campaign_members')
    .select('user_id, role')
    .eq('campaign_id', campaignId)

  const members = memberData ?? []
  const memberIds = members.map((m) => m.user_id as string)
  const names = new Map<string, string>()
  if (memberIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', memberIds)
    for (const p of profiles ?? []) {
      names.set(p.id as string, (p.username as string | null) ?? 'Unknown')
    }
  }

  let responses: ResponseRow[] = []
  if (requests.length > 0) {
    const { data } = await supabase
      .from('roll_history')
      .select('id, request_id, user_id, results')
      .eq('campaign_id', campaignId)
      .in('request_id', requests.map((r) => r.id))
    responses = (data ?? []) as ResponseRow[]
  }

  if (isDm) {
    const targets: RequestTarget[] = members
      .filter((m) => m.user_id !== user.id)
      .map((m) => ({ userId: m.user_id as string, name: names.get(m.user_id as string) ?? 'Unknown' }))

    return (
      <div
        className="rounded-lg border p-5 space-y-4"
        style={{ borderColor: 'var(--border)', background: 'var(--background-surface)' }}
      >
        <RollRequestRealtime campaignId={campaignId} />
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--foreground-muted)' }}>
          Roll Requests
        </h2>

        <RollRequestForm campaignId={campaignId} targets={targets} />

        {requests.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
            No open requests.
          </p>
        ) : (
          <ul className="space-y-3">
            {requests.map((req) => {
              const replies = responses.filter((r) => r.request_id === req.id)
              return (
                <li
                  key={req.id}
                  className="rounded-lg border p-3"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                      {req.label}
                      <span className="ml-2 text-xs" style={{ color: 'var(--foreground-muted)' }}>
                        {req.target_user_id ? `· ${names.get(req.target_user_id) ?? 'Unknown'}` : '· whole party'}
                      </span>
                    </span>
                    <CloseRequestButton requestId={req.id} />
                  </div>
                  {replies.length === 0 ? (
                    <p className="mt-2 text-xs" style={{ color: 'var(--foreground-muted)' }}>
                      Waiting for rolls…
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-sm">
                      {replies.map((reply) => {
                        const outcome = evaluateAgainstDc(reply.results.total, req.dc)
                        return (
                          <li key={reply.id} className="flex items-baseline justify-between gap-2">
                            <span style={{ color: 'var(--foreground)' }}>{names.get(reply.user_id) ?? 'Unknown'}</span>
                            <span className="font-bold" style={{ color: 'var(--accent-gold)' }}>
                              {reply.results.total}
                              {outcome && (
                                <span
                                  className="ml-1 text-xs font-normal"
                                  style={{ color: outcome === 'pass' ? '#3a9d4e' : '#e74c3c' }}
                                >
                                  {outcome === 'pass' ? 'pass' : 'fail'}
                                </span>
                              )}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }

  // Player view: only the open requests aimed at them that they haven't answered.
  const pending = pendingRequestsForPlayer(requests, responses, user.id)
  if (pending.length === 0) return <RollRequestRealtime campaignId={campaignId} />

  return (
    <div
      className="rounded-lg border p-5 space-y-3"
      style={{ borderColor: 'var(--border)', background: 'var(--background-surface)' }}
    >
      <RollRequestRealtime campaignId={campaignId} />
      <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--foreground-muted)' }}>
        The DM is asking for a roll
      </h2>
      {pending.map((req) => (
        <RollRequestPrompt key={req.id} request={req} />
      ))}
    </div>
  )
}
