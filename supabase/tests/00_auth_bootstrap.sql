-- Minimal stand-in for the parts of Supabase's managed `auth` schema that our
-- migrations depend on, so the real RLS policies can be exercised against a
-- throwaway Postgres (CI service container or local) with no Supabase running.
--
-- It recreates just enough to be faithful:
--   * `anon` / `authenticated` roles (RLS policies target `authenticated`)
--   * `auth.users` (FK target + the signup-trigger source)
--   * `auth.uid()` reading the JWT `sub` claim from a session GUC, exactly like
--     Supabase — so `SET request.jwt.claim.sub = '<uuid>'` simulates a logged-in
--     user and the policies behave as they do in production.

create schema if not exists auth;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
end
$$;

grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;

-- Mirrors the columns our handle_new_user() trigger reads.
create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

-- Supabase's auth.uid(): the current request's authenticated user id, taken from
-- the verified JWT. Here it reads the same GUC Supabase populates per request.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
