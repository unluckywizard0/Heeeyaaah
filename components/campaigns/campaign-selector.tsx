'use client'

import type { CampaignMembership } from '@/lib/types/dnd'

/** A small GET-form dropdown that switches the `?campaign=` query param. */
export function CampaignSelector({
  memberships,
  selectedId,
}: {
  memberships: CampaignMembership[]
  selectedId: string
}) {
  return (
    <form method="get" className="flex items-center gap-2 text-sm">
      <label htmlFor="campaign" style={{ color: 'var(--foreground-muted)' }}>
        Campaign
      </label>
      <select
        id="campaign"
        name="campaign"
        defaultValue={selectedId}
        onChange={(e) => e.currentTarget.form?.submit()}
        className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none"
        style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
      >
        {memberships.map(({ campaign }) => (
          <option key={campaign.id} value={campaign.id}>
            {campaign.name}
          </option>
        ))}
      </select>
    </form>
  )
}
