import { createClient } from '@/lib/supabase/server'
import type { RollHistory } from '@/lib/types/dnd'
import { RollHistoryRealtime } from '@/components/combat/roll-history-realtime'
import { RollLogger } from '@/components/combat/roll-logger'

/**
 * Recent rolls for the campaign (KAN-16). RLS already filters out other
 * players' private rolls (the DM sees everything; everyone sees shared rolls
 * and their own private ones).
 */
export async function RollHistoryFeed({ campaignId }: { campaignId: string }) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('roll_history')
    .select('id, campaign_id, user_id, character_id, expression, results, context, is_private, created_at')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(20)

  const rolls = (data ?? []) as RollHistory[]

  const userIds = [...new Set(rolls.map((r) => r.user_id))]
  let names = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', userIds)
    names = new Map((profiles ?? []).map((p) => [p.id as string, (p.username as string | null) ?? 'Unknown']))
  }

  return (
    <div
      className="rounded-lg border p-5 space-y-4"
      style={{ borderColor: 'var(--border)', background: 'var(--background-surface)' }}
    >
      <RollHistoryRealtime campaignId={campaignId} />
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--foreground-muted)' }}>
          Roll History
        </h2>
        <RollLogger campaignId={campaignId} />
      </div>

      {rolls.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
          No rolls logged yet.
        </p>
      ) : (
        <ul className="space-y-1 text-sm">
          {rolls.map((r) => (
            <li key={r.id} className="flex items-baseline justify-between gap-2">
              <span style={{ color: 'var(--foreground)' }}>
                <span className="font-medium">{names.get(r.user_id) ?? 'Unknown'}</span>
                {' rolled '}
                <span className="font-mono">{r.expression}</span>
                {r.context ? ` (${r.context})` : ''}
                {r.is_private && (
                  <span className="ml-1 text-xs" style={{ color: 'var(--foreground-muted)' }}>
                    · private
                  </span>
                )}
              </span>
              <span className="font-bold whitespace-nowrap" style={{ color: 'var(--accent-gold)' }}>
                {r.results.total}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
