# Project North Star — D&D Platform

## Context

The goal is to build a modern, private D&D 5e (2024-first) digital platform that takes everything that works from D&D Beyond, discards what doesn't, and fills the gaps left by every existing tool. The result is a reactive, modular, role-aware ecosystem where players and DMs load up exactly what they need — no more, no less.

**What D&D Beyond gets right (keep):** Character data model, spell/item/rule reference, campaign linking, online accessibility.

**What D&D Beyond gets wrong (improve or replace):** Rigid non-customizable UI, weak combat/initiative tracking, no encounter builder, no DM visibility controls, no modular layout.

**What we're adding:** 3D physics dice, snap-grid modular character sheets, inline rules tagging (`[spell]Fireball[/spell]`), role-based data visibility (DM sees all / players see their lane), custom homebrew content creation, reactive status/condition tracking.

---

## North Star Statement

> A scalable, user-intuitive D&D ecosystem where players and DMs load what they need in a reactive, adaptive framework — built modular, tagged, role-aware, and 2024-first.

---

## Edition Priority

- **2024 rules are the default.** When 5e.tools data contains both a 2014 and 2024 version of a rule, class feature, spell, or monster, the 2024 version is used.
- Campaign settings expose an `edition` flag (`2014` | `2024`) for DMs running legacy campaigns.
- The data import pipeline tags every entity with its source and edition.

---

## Feature Wishlist (North Star Scope)

### Character Builder
- [ ] Create/manage characters (name, species, class, background, alignment)
- [ ] Full 2024 5e support; 2014 available via campaign edition setting
- [ ] Multiclassing support
- [ ] Ability scores, modifiers, saving throws, skills
- [ ] HP tracking (current, max, temporary HP) with radial/pip indicators
- [ ] Hit dice management and recovery
- [ ] Spell slots per level (radial pip trackers per level)
- [ ] Spell list (prepared / known / always-prepared distinctions)
- [ ] Equipment / inventory with attunement slot tracking
- [ ] Class features and traits (auto-populated, version-aware)
- [ ] Leveling up wizard (auto-applies features, HP rolls, spell slot changes)
- [ ] Death saving throws tracker
- [ ] Conditions tracker with status badges (Poisoned, Stunned, etc.)
- [ ] Exhaustion level tracker
- [ ] Inspiration toggle
- [ ] Passive stats (Perception, Insight, Investigation)
- [ ] Concentration tracker

### Modular Sheet Layout
- [ ] Default optimized layout for each character type
- [ ] Snap-to-grid drag-and-drop module rearrangement
- [ ] Modules: Identity, Ability Scores, Combat Stats, Saving Throws, Skills, Actions, Spell Slots, Spells, Inventory, Features, Notes, Dice, Conditions, Death Saves
- [ ] Layout serialized to DB — persists per user per character
- [ ] "Reset to default" option

### 3D Dice Roller
- [ ] Physically-simulated 3D shaded dice (d4, d6, d8, d10, d12, d20, d%)
- [ ] Rolling 4d6 shows 4 dice on screen simultaneously with physics
- [ ] Roll from character sheet context (attack, skill check, save, damage) — modifier-aware
- [ ] Advantage / disadvantage mode (rolls 2d20, highlights relevant die)
- [ ] Roll history / log per session
- [ ] Rolls broadcast to campaign in real time

### Inline Rules Tagging
- [ ] Tag syntax: `[spell]Fireball[/spell]`, `[condition]Poisoned[/condition]`, `[item]+1 Longsword[/item]`, `[monster]Goblin[/monster]`, `[feat]Alert[/feat]`
- [ ] Renders as styled inline hyperlinks anywhere text appears (item descriptions, DM notes, class features, homebrew content)
- [ ] Click/tap opens a drawer/tooltip with the full rule content pulled from Supabase
- [ ] Custom homebrew content is taggable in the same system
- [ ] Parser is a reusable React hook (`useRuleInliner(text)`)

### Campaign & Party
- [ ] Create campaign, set edition, invite players by link/code
- [ ] DM view (all data) vs. Player view (scoped data)
- [ ] Real-time party HP overview for DM
- [ ] Real-time roll sharing across campaign
- [ ] Session notes (DM-only and shared)

### Role-Based Visibility
- [ ] DM sees: all monster HP, legendary action counts, lair actions, hidden notes, full initiative list
- [ ] Players see: their own character, party member HP/conditions, turn order (names + public action economy only), their own rolls + shared rolls
- [ ] Players cannot see: enemy legendary action remaining, hidden monster HP (DM may reveal), DM notes, unrevealed monster names
- [ ] Enforced at DB level via Supabase RLS + split tables

### Combat / Initiative Tracker
- [ ] Add combatants: linked characters + monsters from bestiary (or custom)
- [ ] Initiative roll (auto from DEX, or manual override)
- [ ] Turn order management (advance, delay, hold, ready action)
- [ ] Per-combatant HP bar with damage / healing input
- [ ] Conditions per combatant with badge indicators and duration countdown
- [ ] Concentration tracker (flags caster when taking damage)
- [ ] Action economy display: Action / Bonus Action / Reaction / Movement toggles
- [ ] DM-only panel: legendary actions, resistances, hidden stats
- [ ] Legendary actions counter (DM-visible only per round)
- [ ] "End turn" button broadcasts to all players in real time

### Encounter Builder
- [ ] Search + add monsters from 5e.tools bestiary
- [ ] XP budget calculator (easy / medium / hard / deadly thresholds per 2024 rules)
- [ ] CR vs. party level balance indicator
- [ ] Save/load encounter templates per campaign
- [ ] One-click "Launch Combat" — pushes encounter to live combat tracker

### Rules Reference
- [ ] Searchable spell browser (filter: class, level, school, edition)
- [ ] Monster / bestiary lookup with full stat blocks
- [ ] Items and equipment reference
- [ ] Conditions & diseases reference
- [ ] Class feature / subclass browser
- [ ] All content tagged and hyperlinkable

### Homebrew / Custom Content
- [ ] Create custom: weapons, items, spells, monsters, class features
- [ ] Custom content lives in Supabase alongside 5e.tools data
- [ ] Taggable in the same `[type]name[/type]` system
- [ ] Scoped to campaign or personal library
- [ ] Share homebrew content with campaign members

---

## Tech Stack (Locked)

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js 15 (App Router, TypeScript) | SSR + RSC + excellent Vercel integration |
| Database | Supabase (Postgres + JSONB) | Auth + Realtime + RLS + storage in one |
| Auth | Supabase Auth (magic link + OAuth) | Native to stack |
| Realtime | Supabase Realtime (row subscriptions) | Combat sync, roll sharing |
| Modular Grid | react-grid-layout | ~2M/wk downloads, React 18+, TS, SSR-safe, 15kb |
| 3D Dice | @3d-dice/dice-box (Three.js + Cannon-es) | Only production-ready option, MIT, 2–4hr integration |
| Hosting | Vercel (frontend) + Supabase Cloud | Zero-config deploys, scales free → paid |
| Styling | Tailwind CSS + shadcn/ui | Consistent design system, accessible primitives |
| Data Source | 5e.tools (5etools-mirror-3/5etools-src) | Most complete, weekly updates, 2024 content |

---

## Data Architecture

### Supabase Tables

**Users & Campaigns**
```
users               — id, email, username, avatar_url
campaigns           — id, name, dm_user_id, edition (2014|2024), invite_code, created_at
campaign_members    — id, campaign_id, user_id, role (dm|player), joined_at
```

**Characters**
```
characters          — id, user_id, campaign_id, name, edition,
                      class_data JSONB, race_data JSONB, background_data JSONB,
                      stats JSONB, hp JSONB, spells JSONB, inventory JSONB,
                      features JSONB, conditions JSONB, death_saves JSONB,
                      sheet_layout JSONB,    ← react-grid-layout state
                      created_at, updated_at
```

**Combat**
```
combat_encounters       — id, campaign_id, name, is_active, initiative_order JSONB
combat_creatures        — id, encounter_id, name, initiative, hp_current, hp_max,
                          ac, conditions JSONB, action_economy JSONB,
                          is_player BOOL, character_id, is_active
combat_creature_secrets — id, creature_id, legendary_actions_remaining INT,
                          legendary_resistance_remaining INT, lair_actions JSONB,
                          dm_notes TEXT, revealed_hp BOOL
```
RLS policy: `combat_creature_secrets` — SELECT allowed only if `auth.uid()` matches `campaigns.dm_user_id`.

**Saved Encounters**
```
encounter_templates — id, campaign_id, name, monsters JSONB, party_size INT,
                      party_level INT, xp_budget JSONB
```

**Roll History**
```
roll_history — id, campaign_id, user_id, character_id, expression TEXT,
               results JSONB, context (attack|skill|save|damage|custom), is_private BOOL, created_at
```
RLS: private rolls visible to roller + DM only.

**Rules Content (seeded from 5e.tools)**
```
rules_spells     — id, slug, name, source, edition, level, school, classes JSONB, data JSONB
rules_monsters   — id, slug, name, source, edition, cr DECIMAL, type, data JSONB
rules_items      — id, slug, name, source, edition, rarity, item_type, data JSONB
rules_classes    — id, slug, name, source, edition, data JSONB
rules_conditions — id, slug, name, data JSONB
rules_feats      — id, slug, name, source, edition, data JSONB
rules_races      — id, slug, name, source, edition, data JSONB
```

**Homebrew / Custom Content**
```
custom_content — id, user_id, campaign_id, type (spell|item|weapon|monster|feat),
                 name, slug, data JSONB, is_campaign_shared BOOL, created_at
```

### 5e.tools Import Pipeline
1. Clone/fetch `5etools-mirror-3/5etools-src` at build time (or scheduled sync job)
2. Transform script: parse JSON files, normalize `{@tag}` syntax, tag each entity with `source` + `edition`
3. Seed Supabase `rules_*` tables — upsert on `(slug, source)` key
4. Weekly cron re-sync to pick up new releases

### Tag Parser Architecture
```
useRuleInliner(text: string): JSX
  → regex: /\[(\w+)\]([^\[]+)\[\/\1\]/g
  → for each match: render <RuleLink type={type} name={name} />
  → RuleLink: hover/click → Supabase lookup (rules_* tables + custom_content)
  → renders as drawer/tooltip with full rule text
  → custom content checked first, 5e.tools data as fallback
```

### Realtime Subscriptions (Supabase channels)
- `combat_creatures` → HP changes, condition updates, turn advances
- `roll_history` → roll broadcast to party
- `combat_encounters` → initiative order changes, encounter state
- `characters` → HP/condition sync during combat

---

## UI Design Principles

- **Dark theme** — fits the D&D aesthetic, reduces eye strain in evening sessions
- **Radial pip trackers** — spell slots, hit dice, class feature uses displayed as fillable circles
- **Status badges** — condition icons (skull=dead, flame=burning, etc.) overlaid on combatant cards
- **Minimal click depth** — common actions (damage, heal, advance turn) reachable in 1–2 clicks
- **Module snap grid** — react-grid-layout, 12-column responsive grid, modules have minimum sizes
- **3D dice overlay** — dice render in a floating canvas layer over the sheet, dismiss after roll

---

## Phased Implementation

### Phase 1 — Foundation (Build first)
- Project scaffold: Next.js 15 + Supabase + Tailwind + shadcn/ui
- 5e.tools import pipeline and seed script
- Auth: sign up, magic link, campaign creation with DM/player roles
- Core character sheet: modular grid, ability scores, HP, conditions, saving throws, skills
- Basic dice roller: `@3d-dice/dice-box` integrated, roll from sheet

### Phase 2 — Campaign & Party
- Campaign invites and membership
- Real-time roll sharing (Supabase Realtime)
- Party overview for DM (all characters' HP/conditions live)
- Session notes

### Phase 3 — Combat Tracker
- Initiative order, turn management
- Per-combatant HP/condition tracking
- DM/player visibility split (RLS enforced)
- Action economy toggles
- Real-time turn broadcast

### Phase 4 — Encounter Builder
- Monster search from `rules_monsters`
- XP budget + CR calculator (2024 rules)
- Save/load templates
- Launch Combat integration

### Phase 5 — Rules Reference & Tagging
- `useRuleInliner` hook and `<RuleLink>` component
- Spell / item / condition / feat browser
- Tag support across all text fields in the app

### Phase 6 — Homebrew
- Custom content creation forms (spell, item, weapon, monster)
- Custom content integrated into tag system
- Campaign sharing

---

## Team Collaboration

- **GitHub repo:** `unluckywizard0/Heeeyaaah` (main branch) — plan doc and future design specs live here for team review
- **Jira:** `poopoopeepee.atlassian.net`, project `KAN` — phase tasks tracked as tickets
- **PR workflow:** All plan/spec updates go via PR for team review before merge

## Verification Plan

Each phase ships with:
1. `npm run dev` — local dev confirms UI renders without errors
2. Supabase Studio — confirm tables seeded, RLS policies enforced (test DM vs. player query results differ)
3. Realtime test — two browser windows in same campaign, confirm HP changes / rolls broadcast
4. Dice test — roll 4d6, confirm 4 dice appear with physics and resolve correctly
5. Tag test — item description with `[spell]Fireball[/spell]` renders as clickable link opening correct tooltip

---

## Open Questions (resolved)
- Edition: 2024 default, 2014 available ✅
- Custom content: yes, full homebrew creation ✅
- 3D dice: `@3d-dice/dice-box`, physics-simulated ✅
- Role visibility: Supabase RLS + split tables ✅
- Modular layout: `react-grid-layout` ✅
- Data source: 5e.tools (5etools-mirror-3/5etools-src), weekly sync ✅
- Hosting: Vercel + Supabase Cloud ✅
- Commercial: Private use only ✅
