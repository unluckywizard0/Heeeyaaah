-- KAN-16 — Real-time roll history.
--
-- Every dice roll a campaign member makes can be logged so the table sees it
-- live. `is_private` lets a player roll "just for the DM" (e.g. a secret
-- Perception check) — visible only to the roller and the campaign's DM, same
-- visibility split as session_notes' dm_only/shared but keyed off a boolean
-- since every row has exactly one author. Reuses is_campaign_member /
-- is_campaign_dm to avoid RLS recursion. The log is append-only: no update or
-- delete policies.

create table if not exists public.roll_history (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  -- No FK to `characters`: that table lands with KAN-13 on a separate branch.
  character_id uuid,
  expression  text not null,
  -- { dice: string, rolls: number[], modifier: number, total: number }
  results     jsonb not null,
  context     text not null default '',
  is_private  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists roll_history_campaign_id_idx on public.roll_history (campaign_id, created_at desc);

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table public.roll_history enable row level security;

grant select, insert on public.roll_history to authenticated;

-- Read: campaign members see every shared roll, plus their own private rolls;
-- the DM additionally sees every private roll in their campaign.
create policy "rolls_select_member" on public.roll_history
  for select to authenticated
  using (
    public.is_campaign_member(campaign_id)
    and (
      not is_private
      or user_id = (select auth.uid())
      or public.is_campaign_dm(campaign_id)
    )
  );

-- Write: members log rolls as themselves only.
create policy "rolls_insert_member" on public.roll_history
  for insert to authenticated
  with check (
    user_id = (select auth.uid()) and public.is_campaign_member(campaign_id)
  );
