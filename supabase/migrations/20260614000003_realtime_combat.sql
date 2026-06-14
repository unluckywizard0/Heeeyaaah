-- KAN-23 — Real-time combat broadcast.
--
-- HP/condition/turn changes the DM makes should appear for every campaign
-- member without a manual reload. Supabase Realtime streams row changes over
-- the existing RLS-gated subscription, so no policy changes are needed —
-- only:
--   * REPLICA IDENTITY FULL so UPDATE/DELETE messages include the full old
--     row (the client filters DELETEs on combat_creatures by encounter_id,
--     which the default replica identity — primary key only — would omit).
--   * Adding both tables to the `supabase_realtime` publication.
--
-- The publication only exists on a real Supabase project; the throwaway
-- Postgres used by scripts/test-rls.sh has no such publication, so the ADD
-- TABLE step is skipped there rather than failing the isolation test run.

alter table public.combat_encounters replica identity full;
alter table public.combat_creatures replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'combat_encounters'
    ) then
      alter publication supabase_realtime add table public.combat_encounters;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'combat_creatures'
    ) then
      alter publication supabase_realtime add table public.combat_creatures;
    end if;
  end if;
end
$$;
