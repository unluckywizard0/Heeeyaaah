# Supabase setup

Database schema and seed tooling for the Nerdos D&D platform.

## Migrations

| File | Ticket | Contents |
| --- | --- | --- |
| `migrations/20260613000001_init_auth_campaigns.sql` | KAN-12 | `profiles`, `campaigns`, `campaign_members`, DM/player roles, invite-code join RPC, RLS |
| `migrations/20260613000002_rules_content.sql` | KAN-11 | `rules_spells` / `_monsters` / `_items` / `_classes` / `_conditions` / `_feats` / `_races`, public-read RLS |

### Apply them

**Option A — Supabase CLI (recommended)**

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

`supabase link`/`supabase init` will generate the local `config.toml`; it is not
committed so each dev points at their own project.

**Option B — SQL editor**

Open the Supabase Studio SQL editor and run each migration file in order
(`…000001` then `…000002`).

## Auth providers (KAN-12)

Magic-link email works out of the box. To enable the OAuth buttons on the login
page, configure providers in **Authentication → Providers**:

- **Discord** and **Google** — paste each provider's client ID/secret.
- **Authentication → URL Configuration → Redirect URLs**: add
  `http://localhost:3000/auth/callback` and your deployed
  `https://<domain>/auth/callback`.

Buttons for un-configured providers simply surface Supabase's error; nothing
breaks if you only want magic links for now.

## Seeding rules content (KAN-11)

The importer clones `5etools-mirror-3/5etools-src` (sparse — `data/` only),
normalizes `{@tag}` markup, tags every entity by `source` + `edition`
(2024 is the default; see `lib/import/sources.ts`), and upserts on `(slug, source)`.

```bash
# 1. Set server-only credentials (never expose the service-role key to the client)
cp .env.example .env.local   # then fill in SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY

# 2. Sanity-check the transforms (no DB, no network)
npm run import:5etools -- --self-test

# 3. Parse everything without writing
npm run import:5etools -- --dry-run

# 4. Seed for real
npm run import:5etools

# Useful flags
npm run import:5etools -- --only=spells,monsters
npm run import:5etools -- --data-dir=/path/to/5etools-src/data --no-clone
```

### Weekly auto-sync

`.github/workflows/sync-5etools.yml` re-runs the importer every Monday (and on
demand). Add these **repository secrets** (Settings → Secrets and variables →
Actions):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
