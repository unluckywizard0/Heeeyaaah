import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { CampaignMembership, CombatCreature, CombatEncounter } from '@/lib/types/dnd'
import { CombatTracker } from '@/components/combat/combat-tracker'
import { PartyOverview } from '@/components/combat/party-overview'
import { NewEncounterForm } from '@/components/combat/new-encounter-form'
import { DraftEncounter } from '@/components/combat/draft-encounter'
import { CampaignSelector } from '@/components/combat/campaign-selector'

export const metadata: Metadata = {
  title: 'Combat',
}

export default async function CombatPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string }>
}) {
  const { campaign: campaignParam } = await searchParams
  const supabase = await createClient()

  const { data: membershipData } = await supabase
    .from('campaign_members')
    .select('role, campaign:campaigns(id, name, edition, invite_code, dm_user_id, created_at)')
    .order('joined_at', { ascending: true })

  const memberships = (membershipData ?? []) as unknown as CampaignMembership[]

  if (memberships.length === 0) {
    return (
      <div className="space-y-6">
        <Header />
        <p
          className="rounded-lg border border-dashed p-6 text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--foreground-muted)' }}
        >
          You&apos;re not in any campaigns yet. Create or join one from the dashboard first.
        </p>
      </div>
    )
  }

  const selected =
    memberships.find((m) => m.campaign.id === campaignParam) ?? memberships[0]
  const isDm = selected.role === 'dm'

  const { data: encounters } = await supabase
    .from('combat_encounters')
    .select('id, campaign_id, name, is_active, round_number, current_turn_index, initiative_order')
    .eq('campaign_id', selected.campaign.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const encounter = ((encounters ?? [])[0] ?? null) as CombatEncounter | null

  let creatures: CombatCreature[] = []
  if (encounter) {
    const { data } = await supabase
      .from('combat_creatures')
      .select(
        'id, encounter_id, name, dex_mod, initiative, hp_current, hp_max, temp_hp, ac, conditions, condition_timers, concentration, death_save_successes, death_save_failures, action_economy, turn_status, is_player, character_id, is_active'
      )
      .eq('encounter_id', encounter.id)
      .order('created_at', { ascending: true })
    creatures = (data ?? []) as CombatCreature[]
  }

  return (
    <div className="space-y-6">
      <Header />

      {memberships.length > 1 && (
        <CampaignSelector memberships={memberships} selectedId={selected.campaign.id} />
      )}

      {!encounter || !encounter.is_active ? (
        isDm ? (
          !encounter ? (
            <NewEncounterForm campaignId={selected.campaign.id} />
          ) : (
            <DraftEncounter encounter={encounter} creatures={creatures} />
          )
        ) : (
          <p
            className="rounded-lg border border-dashed p-6 text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground-muted)' }}
          >
            No active encounter. Your DM hasn&apos;t started combat yet.
          </p>
        )
      ) : (
        <>
          <PartyOverview creatures={creatures} />
          <CombatTracker encounter={encounter} creatures={creatures} isDm={isDm} />
        </>
      )}
    </div>
  )
}

function Header() {
  return (
    <header>
      <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
        Combat Tracker
      </h1>
      <p className="mt-2 text-sm" style={{ color: 'var(--foreground-muted)' }}>
        Roll initiative, track turn order, and step through the round.
      </p>
    </header>
  )
}
