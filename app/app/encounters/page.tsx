import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { CampaignMembership, EncounterTemplate } from '@/lib/types/dnd'
import { EncounterCalculator } from '@/components/encounters/encounter-calculator'
import { CampaignSelector } from '@/components/combat/campaign-selector'

export const metadata: Metadata = {
  title: 'Encounters',
}

export default async function EncountersPage({
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
  const selected = memberships.find((m) => m.campaign.id === campaignParam) ?? memberships[0] ?? null
  const isDm = selected?.role === 'dm'

  // Templates are a DM planning tool; RLS only returns rows for campaigns the
  // caller DMs, so this is empty (and the save/load panel hidden) for players.
  let templates: EncounterTemplate[] = []
  if (selected && isDm) {
    const { data } = await supabase
      .from('encounter_templates')
      .select('id, campaign_id, created_by, name, party, monsters, created_at, updated_at')
      .eq('campaign_id', selected.campaign.id)
      .order('updated_at', { ascending: false })
    templates = (data ?? []) as EncounterTemplate[]
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
            Encounter Calculator
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--foreground-muted)' }}>
            Size a fight with the 2024 DMG XP budget. Set your party and add monsters by challenge rating to see the difficulty.
          </p>
        </div>
        {memberships.length > 1 && selected && (
          <CampaignSelector memberships={memberships} selectedId={selected.campaign.id} />
        )}
      </header>

      <EncounterCalculator
        campaignId={isDm ? selected!.campaign.id : undefined}
        templates={templates}
      />
    </div>
  )
}
