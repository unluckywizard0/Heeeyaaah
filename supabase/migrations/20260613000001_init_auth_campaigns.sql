-- KAN-12 — Auth foundation: profiles, campaigns, memberships, DM/player roles.
--
-- Design notes:
--   * `profiles` mirrors `auth.users` (managed by Supabase Auth) so the app has a
--     queryable identity table. It is populated by a trigger on user signup.
--   * Campaign visibility is enforced with RLS. To avoid the classic
--     "infinite recursion detected in policy" trap (campaigns policy reads
--     campaign_members, whose policy reads campaigns…), membership/DM checks go
--     through SECURITY DEFINER helper functions that bypass RLS.

-- ─── Helper: short, human-friendly invite codes ───────────────────────────────
-- 8 chars from an unambiguous alphabet (no 0/O/1/I/L). Collisions are caught by
-- the UNIQUE constraint on campaigns.invite_code; the server action retries.
create or replace function public.gen_invite_code()
returns text
language sql
volatile
as $$
  select string_agg(
    substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789',
           (floor(random() * 30) + 1)::int, 1),
    ''
  )
  from generate_series(1, 8);
$$;

-- ─── Tables ───────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  username   text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  dm_user_id  uuid not null references auth.users (id) on delete cascade,
  edition     text not null default '2024' check (edition in ('2014', '2024')),
  invite_code text not null unique default public.gen_invite_code(),
  created_at  timestamptz not null default now()
);
create index if not exists campaigns_dm_user_id_idx on public.campaigns (dm_user_id);

create table if not exists public.campaign_members (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null default 'player' check (role in ('dm', 'player')),
  joined_at   timestamptz not null default now(),
  unique (campaign_id, user_id)
);
create index if not exists campaign_members_user_id_idx on public.campaign_members (user_id);
create index if not exists campaign_members_campaign_id_idx on public.campaign_members (campaign_id);

-- ─── SECURITY DEFINER helpers (RLS-recursion breakers) ────────────────────────
create or replace function public.is_campaign_member(cid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.campaign_members m
    where m.campaign_id = cid and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_campaign_dm(cid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.campaigns c
    where c.id = cid and c.dm_user_id = auth.uid()
  );
$$;

create or replace function public.shares_campaign_with(target uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.campaign_members me
    join public.campaign_members them on them.campaign_id = me.campaign_id
    where me.user_id = auth.uid() and them.user_id = target
  );
$$;

grant execute on function public.gen_invite_code() to authenticated;
grant execute on function public.is_campaign_member(uuid) to authenticated;
grant execute on function public.is_campaign_dm(uuid) to authenticated;
grant execute on function public.shares_campaign_with(uuid) to authenticated;

-- ─── Triggers: auto-create profile on signup, DM membership on campaign create ─
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'user_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, 'adventurer'), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_new_campaign()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.campaign_members (campaign_id, user_id, role)
  values (new.id, new.dm_user_id, 'dm')
  on conflict (campaign_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_campaign_created on public.campaigns;
create trigger on_campaign_created
  after insert on public.campaigns
  for each row execute function public.handle_new_campaign();

-- ─── RPC: join a campaign by invite code ──────────────────────────────────────
-- A joining user is not yet a member, so RLS would hide the campaign from a
-- direct lookup. This SECURITY DEFINER function resolves the code and inserts the
-- caller's membership atomically.
create or replace function public.join_campaign(code text)
returns public.campaigns
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.campaigns;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into c from public.campaigns
  where invite_code = upper(trim(code));

  if c.id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.campaign_members (campaign_id, user_id, role)
  values (c.id, auth.uid(), 'player')
  on conflict (campaign_id, user_id) do nothing;

  return c;
end;
$$;

grant execute on function public.join_campaign(text) to authenticated;

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.campaigns to authenticated;
grant select, insert, update, delete on public.campaign_members to authenticated;

-- profiles: you can see yourself and anyone you share a campaign with.
create policy "profiles_select_self_or_shared" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.shares_campaign_with(id));
create policy "profiles_insert_self" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));
create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- campaigns: visible to the DM and to members; only the DM can mutate.
create policy "campaigns_select_member_or_dm" on public.campaigns
  for select to authenticated
  using (dm_user_id = (select auth.uid()) or public.is_campaign_member(id));
create policy "campaigns_insert_self_dm" on public.campaigns
  for insert to authenticated
  with check (dm_user_id = (select auth.uid()));
create policy "campaigns_update_dm" on public.campaigns
  for update to authenticated
  using (dm_user_id = (select auth.uid()))
  with check (dm_user_id = (select auth.uid()));
create policy "campaigns_delete_dm" on public.campaigns
  for delete to authenticated
  using (dm_user_id = (select auth.uid()));

-- campaign_members: your own rows, plus co-members and the DM can see the roster.
create policy "members_select_self_dm_or_co" on public.campaign_members
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_campaign_dm(campaign_id)
    or public.is_campaign_member(campaign_id)
  );
create policy "members_insert_self" on public.campaign_members
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "members_delete_self_or_dm" on public.campaign_members
  for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_campaign_dm(campaign_id));
