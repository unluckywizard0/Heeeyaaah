-- KAN-19 — Combat tracker core: encounters, combatants, initiative/turn order.
--
-- Scope: one active encounter per campaign at a time. `combat_encounters`
-- tracks the round counter and turn pointer; `combat_creatures` holds the
-- combatant roster. `initiative_order` is a snapshot of creature ids in
-- turn order, captured when combat starts (re-sorting mid-fight would
-- disorient the table, so delay/ready reorder this array directly instead
-- of re-sorting by initiative).

create table if not exists public.combat_encounters (
  id                 uuid primary key default gen_random_uuid(),
  campaign_id        uuid not null references public.campaigns (id) on delete cascade,
  name               text not null default 'Encounter',
  is_active          boolean not null default false,
  round_number       integer not null default 1,
  current_turn_index integer not null default 0,
  initiative_order   uuid[] not null default '{}',
  created_at         timestamptz not null default now()
);
create index if not exists combat_encounters_campaign_id_idx on public.combat_encounters (campaign_id);

create table if not exists public.combat_creatures (
  id             uuid primary key default gen_random_uuid(),
  encounter_id   uuid not null references public.combat_encounters (id) on delete cascade,
  name           text not null,
  dex_mod        integer not null default 0,
  initiative     integer,
  hp_current     integer not null default 10,
  hp_max         integer not null default 10,
  ac             integer not null default 10,
  conditions     text[] not null default '{}',
  action_economy jsonb not null default '{"action": true, "bonus_action": true, "reaction": true, "movement_used": 0}'::jsonb,
  turn_status    text not null default 'normal' check (turn_status in ('normal', 'delayed', 'holding')),
  is_player      boolean not null default false,
  -- No FK to `characters`: that table lands with KAN-13 on a separate branch.
  -- character_id is just an opaque reference until then.
  character_id   uuid,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);
create index if not exists combat_creatures_encounter_id_idx on public.combat_creatures (encounter_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table public.combat_encounters enable row level security;
alter table public.combat_creatures enable row level security;

grant select, insert, update, delete on public.combat_encounters to authenticated;
grant select, insert, update, delete on public.combat_creatures to authenticated;

-- Visible to anyone in the campaign; only the DM runs the tracker.
create policy "encounters_select_member" on public.combat_encounters
  for select to authenticated
  using (public.is_campaign_member(campaign_id) or public.is_campaign_dm(campaign_id));
create policy "encounters_insert_dm" on public.combat_encounters
  for insert to authenticated
  with check (public.is_campaign_dm(campaign_id));
create policy "encounters_update_dm" on public.combat_encounters
  for update to authenticated
  using (public.is_campaign_dm(campaign_id))
  with check (public.is_campaign_dm(campaign_id));
create policy "encounters_delete_dm" on public.combat_encounters
  for delete to authenticated
  using (public.is_campaign_dm(campaign_id));

-- Combatants inherit visibility/mutation rights from their encounter's campaign.
create policy "creatures_select_member" on public.combat_creatures
  for select to authenticated
  using (
    exists (
      select 1 from public.combat_encounters e
      where e.id = encounter_id
        and (public.is_campaign_member(e.campaign_id) or public.is_campaign_dm(e.campaign_id))
    )
  );
create policy "creatures_insert_dm" on public.combat_creatures
  for insert to authenticated
  with check (
    exists (
      select 1 from public.combat_encounters e
      where e.id = encounter_id and public.is_campaign_dm(e.campaign_id)
    )
  );
create policy "creatures_update_dm" on public.combat_creatures
  for update to authenticated
  using (
    exists (
      select 1 from public.combat_encounters e
      where e.id = encounter_id and public.is_campaign_dm(e.campaign_id)
    )
  )
  with check (
    exists (
      select 1 from public.combat_encounters e
      where e.id = encounter_id and public.is_campaign_dm(e.campaign_id)
    )
  );
create policy "creatures_delete_dm" on public.combat_creatures
  for delete to authenticated
  using (
    exists (
      select 1 from public.combat_encounters e
      where e.id = encounter_id and public.is_campaign_dm(e.campaign_id)
    )
  );
