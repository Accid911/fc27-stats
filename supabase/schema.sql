-- FC27 Leicester City Youth Career — Supabase schema (fresh install)
-- Run once in Supabase → SQL Editor → New query → Run.
-- Already have a database? Run the files in migrations/ you haven't run yet, in order.

create table if not exists settings (
  id int primary key default 1 check (id = 1),
  club_name text not null default 'Leicester City',
  creator_name text,
  tagline text,
  youtube_url text,
  currency text not null default '£'
);
insert into settings (id) values (1) on conflict do nothing;

create table if not exists seasons (
  id uuid primary key default gen_random_uuid(),
  number int not null unique,                       -- Season 1, 2, 3…
  tournament text not null default 'Premier League', -- the league played that season
  cups text[] not null default '{}',                -- cups played that season
  cup_results jsonb not null default '{}'::jsonb,   -- how far we got: {"FA Cup": "Winner", "EFL Cup": "Semi-final"}
  notes text,
  created_at timestamptz default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position text,
  country text,
  joined_season_id uuid references seasons(id) on delete set null, -- season he joined the first team
  created_at timestamptz default now()
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  tournament text,
  opponent text not null,
  goals_for int not null default 0,
  goals_against int not null default 0,
  pens_for int,                                     -- penalty shoot-out (cup draws only)
  pens_against int,
  venue text check (venue in ('H','A','N')),
  played_on date,
  video_url text,
  notes text,
  created_at timestamptz default now()
);

-- Extra trophies only: league titles and cup wins come from the league table and cup results.
create table if not exists trophies (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  name text not null
);

-- Transfers & loans (a player's status comes from their latest move)
create table if not exists player_moves (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  type text not null check (type in ('sold', 'loan', 'loan_return', 'released')),
  club text,
  fee numeric(14,2),
  season_id uuid references seasons(id) on delete set null,
  moved_on date,
  notes text,
  created_at timestamptz default now()
);
create index if not exists player_moves_player on player_moves (player_id);

create table if not exists admins (
  email text primary key
);

create table if not exists standings (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  team text not null,
  points int not null default 0,
  won int, drawn int, lost int,
  gf int, ga int,
  unique (season_id, team)
);

create table if not exists match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  rating numeric(3,1) check (rating between 0 and 10),
  goals int not null default 0 check (goals >= 0),
  assists int not null default 0 check (assists >= 0),
  potm boolean not null default false,
  unique (match_id, player_id)
);
create unique index if not exists one_potm_per_match on match_players (match_id) where potm;
create index if not exists match_players_player on match_players (player_id);
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
  foreach t in array array['settings','seasons','standings','players','matches','match_players','trophies','player_moves'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "public read" on %I', t);
    execute format('drop policy if exists "admin write" on %I', t);
    execute format('create policy "public read" on %I for select using (true)', t);
    execute format('create policy "admin write" on %I for all using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

alter table admins enable row level security;  -- no policies: invisible to the public API

grant usage on schema public to anon, authenticated;
grant select on settings, seasons, standings, players, matches, match_players, trophies, player_moves to anon, authenticated;
grant insert, update, delete on settings, seasons, standings, players, matches, match_players, trophies, player_moves to authenticated;
revoke all on admins from anon, authenticated;
grant execute on function is_admin() to anon, authenticated;

-- ───────────────────────── Save helpers ─────────────────────────
-- Save a match + its line-up in one go (all or nothing).

create or replace function save_match(p_match jsonb, p_players jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid := nullif(p_match->>'id', '')::uuid;
begin
  if not is_admin() then raise exception 'Only admins can save matches'; end if;

  if v_id is null then
    insert into matches (season_id, tournament, opponent, goals_for, goals_against, pens_for, pens_against, venue, played_on, video_url, notes)
    values (
      (p_match->>'season_id')::uuid,
      nullif(p_match->>'tournament', ''),
      p_match->>'opponent',
      coalesce(nullif(p_match->>'goals_for', '')::int, 0),
      coalesce(nullif(p_match->>'goals_against', '')::int, 0),
      nullif(p_match->>'pens_for', '')::int,
      nullif(p_match->>'pens_against', '')::int,
      nullif(p_match->>'venue', ''),
      nullif(p_match->>'played_on', '')::date,
      nullif(p_match->>'video_url', ''),
      nullif(p_match->>'notes', '')
    )
    returning id into v_id;
  else
    update matches set
      season_id     = (p_match->>'season_id')::uuid,
      tournament    = nullif(p_match->>'tournament', ''),
      opponent      = p_match->>'opponent',
      goals_for     = coalesce(nullif(p_match->>'goals_for', '')::int, 0),
      goals_against = coalesce(nullif(p_match->>'goals_against', '')::int, 0),
      pens_for      = nullif(p_match->>'pens_for', '')::int,
      pens_against  = nullif(p_match->>'pens_against', '')::int,
      venue         = nullif(p_match->>'venue', ''),
      played_on     = nullif(p_match->>'played_on', '')::date,
      video_url     = nullif(p_match->>'video_url', ''),
      notes         = nullif(p_match->>'notes', '')
    where id = v_id;
    if not found then raise exception 'Match not found'; end if;
    delete from match_players where match_id = v_id;
  end if;

  insert into match_players (match_id, player_id, rating, goals, assists, potm)
  select v_id,
         (x->>'player_id')::uuid,
         nullif(x->>'rating', '')::numeric,
         coalesce(nullif(x->>'goals', '')::int, 0),
         coalesce(nullif(x->>'assists', '')::int, 0),
         coalesce(nullif(x->>'potm', '')::boolean, false)
  from jsonb_array_elements(coalesce(p_players, '[]'::jsonb)) x;

  return v_id;
end $$;

-- Save a season (league + cups) and its league table in one go.
create or replace function save_season(p_season jsonb, p_teams jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid := nullif(p_season->>'id', '')::uuid;
  v_cups text[] := coalesce(
    (select array_agg(trim(c)) from jsonb_array_elements_text(coalesce(p_season->'cups', '[]'::jsonb)) c where trim(c) <> ''),
    '{}'
  );
begin
  if not is_admin() then raise exception 'Only admins can save seasons'; end if;

  if v_id is null then
    insert into seasons (number, tournament, cups, cup_results, notes)
    values ((p_season->>'number')::int, coalesce(nullif(p_season->>'tournament', ''), 'Premier League'), v_cups,
            coalesce(p_season->'cup_results', '{}'::jsonb), nullif(p_season->>'notes', ''))
    returning id into v_id;
  else
    update seasons set
      number     = (p_season->>'number')::int,
      tournament = coalesce(nullif(p_season->>'tournament', ''), 'Premier League'),
      cups       = v_cups,
      cup_results = coalesce(p_season->'cup_results', '{}'::jsonb),
      notes      = nullif(p_season->>'notes', '')
    where id = v_id;
    if not found then raise exception 'Season not found'; end if;
    delete from standings where season_id = v_id;
  end if;

  insert into standings (season_id, team, points, won, drawn, lost, gf, ga)
  select v_id, trim(x->>'team'), coalesce(nullif(x->>'points', '')::int, 0),
         nullif(x->>'won', '')::int, nullif(x->>'drawn', '')::int, nullif(x->>'lost', '')::int,
         nullif(x->>'gf', '')::int, nullif(x->>'ga', '')::int
  from jsonb_array_elements(coalesce(p_teams, '[]'::jsonb)) x
  where trim(coalesce(x->>'team', '')) <> '';

  return v_id;
end $$;

revoke execute on function save_match(jsonb, jsonb) from public, anon;
revoke execute on function save_season(jsonb, jsonb) from public, anon;
grant execute on function save_match(jsonb, jsonb) to authenticated;
grant execute on function save_season(jsonb, jsonb) to authenticated;

-- ───────────────────────── Admins ─────────────────────────
-- Emails allowed to edit (you + the creator). Edit later in Table Editor → admins.
insert into admins (email) values
  ('accidnineoneone@gmail.com'),
  ('creator@example.com')
on conflict do nothing;
