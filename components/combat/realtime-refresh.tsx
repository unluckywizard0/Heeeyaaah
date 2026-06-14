'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Subscribes to live changes on the active encounter's rows (KAN-23) and
 * refreshes the server-rendered combat page when anything changes, so HP,
 * conditions, turn order, and roster edits made by the DM (or in another tab)
 * appear for every campaign member without a manual reload.
 *
 * RLS already gates who can see these rows; Realtime reuses that. Debounced
 * so a batch of inserts (e.g. Launch Combat adding several monsters) triggers
 * one refresh, not one per row.
 */
export function CombatRealtimeRefresh({ encounterId }: { encounterId: string }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let timer: ReturnType<typeof setTimeout> | null = null

    const refresh = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => router.refresh(), 300)
    }

    const channel = supabase
      .channel(`combat:${encounterId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'combat_creatures', filter: `encounter_id=eq.${encounterId}` },
        refresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'combat_encounters', filter: `id=eq.${encounterId}` },
        refresh,
      )
      .subscribe()

    return () => {
      if (timer) clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [encounterId, router])

  return null
}
