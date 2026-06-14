import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { CampaignMembership, SessionNote } from '@/lib/types/dnd'
import { CampaignSelector } from '@/components/campaigns/campaign-selector'
import { NotesBoard } from '@/components/notes/notes-board'

export const metadata: Metadata = {
  title: 'Notes',
}

export default async function NotesPage({
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

  const selected = memberships.find((m) => m.campaign.id === campaignParam) ?? memberships[0]
  const isDm = selected.role === 'dm'

  // RLS already hides dm_only notes from players, so this returns exactly what
  // the viewer is allowed to see.
  const { data } = await supabase
    .from('session_notes')
    .select('id, campaign_id, author_id, title, body, visibility, session_date, created_at, updated_at')
    .eq('campaign_id', selected.campaign.id)
    .order('session_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  const notes = (data ?? []) as SessionNote[]

  return (
    <div className="space-y-6">
      <Header />

      {memberships.length > 1 && (
        <CampaignSelector memberships={memberships} selectedId={selected.campaign.id} />
      )}

      <NotesBoard campaignId={selected.campaign.id} notes={notes} isDm={isDm} />
    </div>
  )
}

function Header() {
  return (
    <header>
      <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
        Session Notes
      </h1>
      <p className="mt-2 text-sm" style={{ color: 'var(--foreground-muted)' }}>
        Keep a record of each session. DM-only notes stay private; shared notes are visible to the whole party.
      </p>
    </header>
  )
}
