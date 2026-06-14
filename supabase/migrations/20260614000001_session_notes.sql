-- KAN-18 — Session notes: DM-only and shared.
--
-- Notes are authored by the DM. `visibility` decides who can read a note:
--   * 'dm_only' — only the campaign's DM
--   * 'shared'  — every campaign member
-- Reuses the is_campaign_dm / is_campaign_member SECURITY DEFINER helpers from
-- the auth/campaigns migration so the policies don't re-trip RLS recursion.

create table if not exists public.session_notes (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  author_id   uuid not null references auth.users (id) on delete cascade,
  title       text not null default 'Untitled',
  body        text not null default '',
  visibility  text not null default 'dm_only' check (visibility in ('dm_only', 'shared')),
  session_date date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists session_notes_campaign_id_idx on public.session_notes (campaign_id);

-- Keep updated_at fresh on every edit.
create or replace function public.touch_session_note()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_session_note_updated on public.session_notes;
create trigger on_session_note_updated
  before update on public.session_notes
  for each row execute function public.touch_session_note();

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table public.session_notes enable row level security;

grant select, insert, update, delete on public.session_notes to authenticated;

-- Read: the DM sees every note; members see only shared ones.
create policy "notes_select_dm_or_shared_member" on public.session_notes
  for select to authenticated
  using (
    public.is_campaign_dm(campaign_id)
    or (visibility = 'shared' and public.is_campaign_member(campaign_id))
  );

-- Write: only the campaign's DM, and only as themselves.
create policy "notes_insert_dm" on public.session_notes
  for insert to authenticated
  with check (
    author_id = (select auth.uid()) and public.is_campaign_dm(campaign_id)
  );
create policy "notes_update_dm" on public.session_notes
  for update to authenticated
  using (public.is_campaign_dm(campaign_id))
  with check (public.is_campaign_dm(campaign_id));
create policy "notes_delete_dm" on public.session_notes
  for delete to authenticated
  using (public.is_campaign_dm(campaign_id));
