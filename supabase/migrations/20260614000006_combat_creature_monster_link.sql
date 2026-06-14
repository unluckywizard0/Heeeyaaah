-- KAN-47 — Link combat_creatures to their bestiary entry (rules_monsters), so
-- the combat tracker can look up the monster's `data` blob and surface
-- clickable attack/damage rolls from its stat block. Optional: hand-added
-- combatants and players have no monster_id.

alter table public.combat_creatures
  add column if not exists monster_id uuid references public.rules_monsters (id) on delete set null;
