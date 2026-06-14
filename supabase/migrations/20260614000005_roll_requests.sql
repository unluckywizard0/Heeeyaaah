-- KAN-49 — DM roll requests & group checks.
--
-- The DM asks one player or the whole party for a skill check or saving throw.
-- Each request is a row here; players answer by logging a normal roll (KAN-16's
-- roll_history) tagged with request_id, so responses collect live in the DM's
-- panel over the same realtime channel — no new response table needed.
--
-- Visibility: a request isn't secret, so every campaign member can read it
-- (players need to see the ones aimed at them or the party). Only the DM
-- creates, closes, or removes requests.

create table if not exists public.roll_requests (
  id             uuid primary key default gen_random_uuid(),
  campaign_id    uuid not null references public.campaigns (id) on delete cascade,
  requested_by   uuid not null references auth.users (id) on delete cascade,
  label          text not null,
  kind           text not null default 'check' check (kind in ('check', 'save')),
  dc             integer,
  -- null target = the whole party; otherwise a single player.
  target_user_id uuid references auth.users (id) on delete cascade,
  is_open        boolean not null default true,
  created_at     timestamptz not null default now()
);
create index if not exists roll_requests_campaign_id_idx
  on public.roll_requests (campaign_id, created_at desc);

-- Tie a logged roll back to the request it answers (KAN-16's table). Nulled if
-- the request is later deleted, leaving the roll in plain history.
alter table public.roll_history
  add column if not exists request_id uuid references public.roll_requests (id) on delete set null;

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table public.roll_requests enable row level security;

grant select, insert, update, delete on public.roll_requests to authenticated;

-- Read: any member of the campaign sees its requests.
create policy "requests_select_member" on public.roll_requests
  for select to authenticated
  using (public.is_campaign_member(campaign_id));

-- Write: only the campaign's DM, and only as themselves.
create policy "requests_insert_dm" on public.roll_requests
  for insert to authenticated
  with check (
    requested_by = (select auth.uid()) and public.is_campaign_dm(campaign_id)
  );
create policy "requests_update_dm" on public.roll_requests
  for update to authenticated
  using (public.is_campaign_dm(campaign_id))
  with check (public.is_campaign_dm(campaign_id));
create policy "requests_delete_dm" on public.roll_requests
  for delete to authenticated
  using (public.is_campaign_dm(campaign_id));

-- ─── Realtime ─────────────────────────────────────────────────────────────────
-- Stream request create/close to players and response inserts to the DM.
-- roll_history was added to roll_history's own migration without joining the
-- publication, so KAN-16's live feed only worked once this ran — add both here.
-- The publication only exists on a real Supabase project; scripts/test-rls.sh's
-- throwaway Postgres has none, so the ADD TABLE steps are skipped there.
alter table public.roll_requests replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'roll_requests'
    ) then
      alter publication supabase_realtime add table public.roll_requests;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'roll_history'
    ) then
      alter publication supabase_realtime add table public.roll_history;
    end if;
  end if;
end
$$;
