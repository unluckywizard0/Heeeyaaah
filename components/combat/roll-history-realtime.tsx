'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Refreshes the page when a new roll is logged for this campaign (KAN-16),
 * so the roll history feed stays live across tabs. Mirrors
 * CombatRealtimeRefresh's debounced-refresh approach.
 */
export function RollHistoryRealtime({ campaignId }: { campaignId: string }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let timer: ReturnType<typeof setTimeout> | null = null

    const refresh = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => router.refresh(), 300)
    }

    const channel = supabase
      .channel(`rolls:${campaignId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'roll_history', filter: `campaign_id=eq.${campaignId}` },
        refresh,
      )
      .subscribe()

    return () => {
      if (timer) clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [campaignId, router])

  return null
}
