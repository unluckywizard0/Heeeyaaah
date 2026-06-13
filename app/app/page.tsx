import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { CampaignMembership } from '@/lib/types/dnd'
import { CreateCampaignForm } from '@/components/campaigns/create-campaign-form'
import { JoinCampaignForm } from '@/components/campaigns/join-campaign-form'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('campaign_members')
    .select('role, campaign:campaigns(id, name, edition, invite_code, dm_user_id, created_at)')
    .order('joined_at', { ascending: true })

  const memberships = (data ?? []) as unknown as CampaignMembership[]
  const dmCampaigns = memberships.filter((m) => m.role === 'dm')
  const playerCampaigns = memberships.filter((m) => m.role === 'player')

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
          Dashboard
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--foreground-muted)' }}>
          Your campaigns live here. Create one as a DM, or join a friend&apos;s with an invite code.
        </p>
      </header>

      {dmCampaigns.length > 0 && (
        <CampaignSection title="Campaigns you run" showInvite memberships={dmCampaigns} />
      )}

      {playerCampaigns.length > 0 && (
        <CampaignSection title="Campaigns you've joined" memberships={playerCampaigns} />
      )}

      {memberships.length === 0 && (
        <p
          className="rounded-lg border border-dashed p-6 text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--foreground-muted)' }}
        >
          No campaigns yet. Create your first below.
        </p>
      )}

      <section className="grid gap-8 md:grid-cols-2">
        <Panel title="Start a campaign" subtitle="You'll be the DM.">
          <CreateCampaignForm />
        </Panel>
        <Panel title="Join a campaign" subtitle="Ask your DM for the invite code.">
          <JoinCampaignForm />
        </Panel>
      </section>
    </div>
  )
}

function CampaignSection({
  title,
  memberships,
  showInvite = false,
}: {
  title: string
  memberships: CampaignMembership[]
  showInvite?: boolean
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--foreground-muted)' }}>
        {title}
      </h2>
      <ul role="list" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {memberships.map(({ campaign }) => (
          <li
            key={campaign.id}
            className="rounded-lg border p-4"
            style={{ borderColor: 'var(--border)', background: 'var(--background-surface)' }}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                {campaign.name}
              </span>
              <span
                className="rounded px-1.5 py-0.5 text-xs"
                style={{ background: 'var(--background-elevated)', color: 'var(--foreground-muted)' }}
              >
                {campaign.edition}
              </span>
            </div>
            {showInvite && (
              <p className="mt-3 text-xs" style={{ color: 'var(--foreground-muted)' }}>
                Invite code:{' '}
                <code className="font-mono tracking-widest" style={{ color: 'var(--accent-gold)' }}>
                  {campaign.invite_code}
                </code>
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-lg border p-6"
      style={{ borderColor: 'var(--border)', background: 'var(--background-surface)' }}
    >
      <h2 className="font-semibold" style={{ color: 'var(--foreground)' }}>
        {title}
      </h2>
      <p className="mt-1 mb-5 text-sm" style={{ color: 'var(--foreground-muted)' }}>
        {subtitle}
      </p>
      {children}
    </div>
  )
}
