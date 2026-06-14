'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Refreshes the page when a roll request opens/closes or a response is logged
 * (KAN-49), so the DM's panel and players' prompts stay live. Mirrors the
 * debounced approach of CombatRealtimeRefresh; roll_history covers responses,
 * roll_requests covers new/closed asks.
 */
export function RollRequestRealtime({ campaignId }: { campaignId: string }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let timer: ReturnType<typeof setTimeout> | null = null

    const refresh = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => router.refresh(), 300)
    }

    const channel = supabase
      .channel(`roll-requests:${campaignId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'roll_requests', filter: `campaign_id=eq.${campaignId}` },
        refresh,
      )
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
