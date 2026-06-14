-- KAN-26 — Saved encounter templates.
--
-- A template is a reusable snapshot of the encounter calculator: the party
-- composition (level/count groups) and the monster line-up (CR/count groups),
-- stored as jsonb so the calculator can round-trip its own state without a
-- rigid column-per-field schema. Templates belong to a campaign and are a DM
-- planning tool, so reads and writes are restricted to the campaign's DM —
-- mirroring the session_notes ownership model and reusing the
-- is_campaign_dm SECURITY DEFINER helper to avoid RLS recursion.

create table if not exists public.encounter_templates (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  created_by  uuid not null references auth.users (id) on delete cascade,
  name        text not null default 'Untitled encounter',
  -- [{ "level": int, "count": int }, ...]
  party       jsonb not null default '[]'::jsonb,
  -- [{ "cr": number, "count": int }, ...]
  monsters    jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists encounter_templates_campaign_id_idx
  on public.encounter_templates (campaign_id);

-- Keep updated_at fresh on every edit.
create or replace function public.touch_encounter_template()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_encounter_template_updated on public.encounter_templates;
create trigger on_encounter_template_updated
  before update on public.encounter_templates
  for each row execute function public.touch_encounter_template();

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table public.encounter_templates enable row level security;

grant select, insert, update, delete on public.encounter_templates to authenticated;

-- Only the campaign's DM can see, create, edit, or delete its templates. Inserts
-- are additionally pinned to the acting user (created_by) so a DM can't forge
-- another author, and to a campaign they actually run.
create policy "templates_select_dm" on public.encounter_templates
  for select to authenticated
  using (public.is_campaign_dm(campaign_id));

create policy "templates_insert_dm" on public.encounter_templates
  for insert to authenticated
  with check (
    created_by = (select auth.uid()) and public.is_campaign_dm(campaign_id)
  );

create policy "templates_update_dm" on public.encounter_templates
  for update to authenticated
  using (public.is_campaign_dm(campaign_id))
  with check (public.is_campaign_dm(campaign_id));

create policy "templates_delete_dm" on public.encounter_templates
  for delete to authenticated
  using (public.is_campaign_dm(campaign_id));
