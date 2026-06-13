-- DM/player RLS isolation proof for KAN-12's auth/campaigns model (KAN-56).
--
-- Run by scripts/test-rls.sh after the auth bootstrap + all migrations are
-- applied. Every check is a plpgsql ASSERT; psql runs with ON_ERROR_STOP=1, so
-- a single failed assertion fails the whole run (and CI).
--
-- The connection role (postgres) owns the tables and therefore BYPASSES RLS, so
-- every access-control check runs under `SET ROLE authenticated` with the JWT
-- `sub` claim set to the user we're simulating. Owner-only steps (creating
-- auth.users, the way Supabase Auth would) run with the role reset.
--
-- Fixtures use fixed UUIDs/codes written as literals: psql does NOT interpolate
-- \set variables inside dollar-quoted blocks, so hardcoding keeps every check
-- consistent whether it sits in a plain statement or a do $$ ... $$ block.
--   DM       = 11111111-1111-1111-1111-111111111111
--   PLAYER   = 22222222-2222-2222-2222-222222222222
--   OUTSIDER = 33333333-3333-3333-3333-333333333333
--   CAMPAIGN = aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa

\set ON_ERROR_STOP on

-- ── Arrange: three accounts exist (signup trigger auto-creates profiles) ──────
reset role;
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'dm@test.local',       '{"user_name":"Dungeon Master"}'),
  ('22222222-2222-2222-2222-222222222222', 'player@test.local',   '{"user_name":"Player One"}'),
  ('33333333-3333-3333-3333-333333333333', 'outsider@test.local', '{"user_name":"Rando"}');

-- ── DM creates a campaign (the trigger adds their own dm membership) ──────────
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.campaigns (id, name, dm_user_id, invite_code)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Curse of Strahd',
        '11111111-1111-1111-1111-111111111111', 'TESTCODE');

do $$
begin
  assert (select count(*) from public.campaigns) = 1,
    'DM should see the campaign they own';
  assert (select count(*) from public.campaign_members) = 1,
    'campaign should start with exactly the DM membership row';
  assert (select role from public.campaign_members) = 'dm',
    'auto-created membership for the creator must be dm';
end
$$;

-- ── A non-member player is fully isolated ────────────────────────────────────
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$
begin
  assert (select count(*) from public.campaigns) = 0,
    'ISOLATION: player must not see a campaign they have not joined';
  assert (select count(*) from public.campaign_members) = 0,
    'ISOLATION: player must not see the roster of a campaign they have not joined';
end
$$;

-- ── Privilege-escalation is blocked (the KAN-12 members_insert_self fix) ──────
-- A direct membership insert must be denied: there is no client INSERT policy,
-- so RLS rejects it. This is the regression guard for the review finding.
do $$
begin
  begin
    insert into public.campaign_members (campaign_id, user_id, role)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            '22222222-2222-2222-2222-222222222222', 'dm');
    assert false,
      'SECURITY: a client must NOT be able to insert their own membership directly';
  exception
    when insufficient_privilege then
      null; -- expected: new row violates row-level security policy
  end;
end
$$;

-- ── Joining via the invite-code RPC is the only path, and grants player role ──
select public.join_campaign('TESTCODE');
do $$
begin
  assert (select count(*) from public.campaigns) = 1,
    'player should see the campaign after joining';
  assert (select count(*) from public.campaign_members where user_id = auth.uid()) = 1,
    'player should see their own membership after joining';
  assert (select role from public.campaign_members where user_id = auth.uid()) = 'player',
    'SECURITY: join_campaign must grant player role, never dm';
end
$$;

-- ── DM sees the full roster; a still-outside user sees nothing ────────────────
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
do $$
begin
  assert (select count(*) from public.campaign_members
          where campaign_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') = 2,
    'DM should see both the dm and the joined player';
end
$$;

set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
do $$
begin
  assert (select count(*) from public.campaigns) = 0,
    'ISOLATION: an unrelated user must not see the campaign';
  assert (select count(*) from public.campaign_members) = 0,
    'ISOLATION: an unrelated user must not see any membership rows';
end
$$;

-- ── Profile visibility follows shared campaigns ──────────────────────────────
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$
begin
  assert (select count(*) from public.profiles) = 2,
    'player should see only their own profile and shared-campaign co-members (DM)';
end
$$;

set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
do $$
begin
  assert (select count(*) from public.profiles) = 1,
    'ISOLATION: an unrelated user should see only their own profile';
end
$$;

reset role;

\echo '✅ RLS isolation checks passed'
