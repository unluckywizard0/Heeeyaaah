-- KAN-20 — Per-combatant state: temp HP, concentration, condition timers, death saves.
--
-- Additive on top of KAN-19's combat_creatures. The existing `conditions text[]`
-- stays the source of truth for which condition badges are active; `condition_timers`
-- layers an OPTIONAL round countdown on top (name -> rounds remaining), so a
-- condition can be either indefinite (no timer) or ticking. End-of-round handling
-- decrements timers and clears expired conditions.

alter table public.combat_creatures
  add column if not exists temp_hp              integer not null default 0,
  add column if not exists concentration        boolean not null default false,
  add column if not exists condition_timers     jsonb   not null default '{}'::jsonb,
  add column if not exists death_save_successes smallint not null default 0
    check (death_save_successes between 0 and 3),
  add column if not exists death_save_failures  smallint not null default 0
    check (death_save_failures between 0 and 3);
