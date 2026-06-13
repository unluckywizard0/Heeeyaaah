-- KAN-11 — 5e.tools reference content. Seeded by scripts/import-5etools.ts using
-- the service-role key (which bypasses RLS). All rules_* tables are world-readable
-- reference data, so RLS allows SELECT to everyone and no client-side writes.
--
-- Upsert key is (slug, source) so the same entity reprinted in multiple sourcebooks
-- coexists, and re-running the importer updates in place. `conditions` are edition-
-- agnostic and key on slug alone.

-- ─── Spells ───────────────────────────────────────────────────────────────────
create table if not exists public.rules_spells (
  id      uuid primary key default gen_random_uuid(),
  slug    text not null,
  name    text not null,
  source  text not null,
  edition text not null check (edition in ('2014', '2024')),
  level   int,
  school  text,
  classes jsonb not null default '[]'::jsonb,
  data    jsonb not null default '{}'::jsonb,
  unique (slug, source)
);
create index if not exists rules_spells_name_idx on public.rules_spells (name);
create index if not exists rules_spells_level_idx on public.rules_spells (level);
create index if not exists rules_spells_edition_idx on public.rules_spells (edition);
create index if not exists rules_spells_classes_idx on public.rules_spells using gin (classes);

-- ─── Monsters ─────────────────────────────────────────────────────────────────
create table if not exists public.rules_monsters (
  id      uuid primary key default gen_random_uuid(),
  slug    text not null,
  name    text not null,
  source  text not null,
  edition text not null check (edition in ('2014', '2024')),
  cr      numeric,
  type    text,
  data    jsonb not null default '{}'::jsonb,
  unique (slug, source)
);
create index if not exists rules_monsters_name_idx on public.rules_monsters (name);
create index if not exists rules_monsters_cr_idx on public.rules_monsters (cr);
create index if not exists rules_monsters_type_idx on public.rules_monsters (type);
create index if not exists rules_monsters_edition_idx on public.rules_monsters (edition);

-- ─── Items ────────────────────────────────────────────────────────────────────
create table if not exists public.rules_items (
  id        uuid primary key default gen_random_uuid(),
  slug      text not null,
  name      text not null,
  source    text not null,
  edition   text not null check (edition in ('2014', '2024')),
  rarity    text,
  item_type text,
  data      jsonb not null default '{}'::jsonb,
  unique (slug, source)
);
create index if not exists rules_items_name_idx on public.rules_items (name);
create index if not exists rules_items_rarity_idx on public.rules_items (rarity);
create index if not exists rules_items_type_idx on public.rules_items (item_type);
create index if not exists rules_items_edition_idx on public.rules_items (edition);

-- ─── Classes ──────────────────────────────────────────────────────────────────
create table if not exists public.rules_classes (
  id      uuid primary key default gen_random_uuid(),
  slug    text not null,
  name    text not null,
  source  text not null,
  edition text not null check (edition in ('2014', '2024')),
  data    jsonb not null default '{}'::jsonb,
  unique (slug, source)
);
create index if not exists rules_classes_name_idx on public.rules_classes (name);
create index if not exists rules_classes_edition_idx on public.rules_classes (edition);

-- ─── Conditions (edition-agnostic) ────────────────────────────────────────────
create table if not exists public.rules_conditions (
  id   uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  data jsonb not null default '{}'::jsonb
);
create index if not exists rules_conditions_name_idx on public.rules_conditions (name);

-- ─── Feats ────────────────────────────────────────────────────────────────────
create table if not exists public.rules_feats (
  id      uuid primary key default gen_random_uuid(),
  slug    text not null,
  name    text not null,
  source  text not null,
  edition text not null check (edition in ('2014', '2024')),
  data    jsonb not null default '{}'::jsonb,
  unique (slug, source)
);
create index if not exists rules_feats_name_idx on public.rules_feats (name);
create index if not exists rules_feats_edition_idx on public.rules_feats (edition);

-- ─── Races / Species ──────────────────────────────────────────────────────────
create table if not exists public.rules_races (
  id      uuid primary key default gen_random_uuid(),
  slug    text not null,
  name    text not null,
  source  text not null,
  edition text not null check (edition in ('2014', '2024')),
  data    jsonb not null default '{}'::jsonb,
  unique (slug, source)
);
create index if not exists rules_races_name_idx on public.rules_races (name);
create index if not exists rules_races_edition_idx on public.rules_races (edition);

-- ─── RLS: public read, no client writes ───────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'rules_spells', 'rules_monsters', 'rules_items', 'rules_classes',
    'rules_conditions', 'rules_feats', 'rules_races'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('grant select on public.%I to anon, authenticated;', t);
    execute format(
      'create policy %I on public.%I for select using (true);',
      t || '_public_read', t
    );
  end loop;
end;
$$;
