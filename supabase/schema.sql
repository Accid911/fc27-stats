-- FC27 Career Mode Stats — Supabase schema
-- Run this once in Supabase → SQL Editor → New query → Run.

-- ───────────────────────── Tables ─────────────────────────

create table if not exists settings (
  id int primary key default 1 check (id = 1),
  club_name text not null default 'My Club',
  creator_name text,
  tagline text,
  youtube_url text
);
insert into settings (id) values (1) on conflict do nothing;

create table if not exists seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,                 -- e.g. "2026/27"
  start_year int not null,            -- used for sorting
  club text,                          -- club managed that season (can change in career mode)
  league text,
  league_position int,
  notes text,
  created_at timestamptz default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position text,                      -- GK, CB, CM, ST, ...
  nationality text,
  shirt_number int,
  overall int,
  potential int,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz default now()
);

create table if not exists player_season_stats (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  season_id uuid not null references seasons(id) on delete cascade,
  appearances int not null default 0,
  goals int not null default 0,
  assists int not null default 0,
  clean_sheets int not null default 0,
  yellow_cards int not null default 0,
  red_cards int not null default 0,
  motm int not null default 0,
  avg_rating numeric(3,1),
  unique (player_id, season_id)
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  played_on date,
  competition text,
  opponent text not null,
  venue text check (venue in ('H','A','N')) default 'H',
  goals_for int not null default 0,
  goals_against int not null default 0,
  video_url text,
  notes text
);

create table if not exists trophies (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  name text not null
);

-- Who may edit. Add your email and the creator's email here.
create table if not exists admins (
  email text primary key
);

-- ───────────────────────── Security ─────────────────────────

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from admins where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

do $$
declare t text;
begin
  foreach t in array array['settings','seasons','players','player_season_stats','matches','trophies'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "public read" on %I', t);
    execute format('drop policy if exists "admin write" on %I', t);
    execute format('create policy "public read" on %I for select using (true)', t);
    execute format('create policy "admin write" on %I for all using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

alter table admins enable row level security;  -- no policies: invisible to the public API

-- Explicit API grants (newer Supabase projects don't expose new tables automatically)
grant usage on schema public to anon, authenticated;
grant select on settings, seasons, players, player_season_stats, matches, trophies to anon, authenticated;
grant insert, update, delete on settings, seasons, players, player_season_stats, matches, trophies to authenticated;
revoke all on admins from anon, authenticated;
grant execute on function is_admin() to anon, authenticated;

-- ───────────────────────── Admins ─────────────────────────
-- Replace with the real emails, then run again (or edit in Table Editor → admins).
insert into admins (email) values
  ('you@example.com'),
  ('creator@example.com')
on conflict do nothing;
