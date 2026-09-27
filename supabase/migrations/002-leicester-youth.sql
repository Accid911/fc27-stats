-- Migration 002 — Leicester City youth career
-- For a database that already ran the FIRST version of schema.sql.
-- Keeps your existing players, seasons and matches. Removes the old
-- per-season stats table (stats are now calculated from match line-ups).
-- Run once in Supabase → SQL Editor → New query → Run.

-- ── Players: name, position, age, country ──
alter table players add column if not exists age int;
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'players' and column_name = 'nationality') then
    alter table players rename column nationality to country;
  end if;
end $$;
alter table players add column if not exists country text;
alter table players
  drop column if exists shirt_number,
  drop column if exists overall,
  drop column if exists potential,
  drop column if exists notes;

-- ── Seasons: number + tournament ──
alter table seasons add column if not exists number int;
alter table seasons add column if not exists tournament text;
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'seasons' and column_name = 'start_year') then
    execute 'update seasons s set number = x.rn from (select id, row_number() over (order by start_year, created_at) rn from seasons) x where s.id = x.id and s.number is null';
    execute 'update seasons set tournament = coalesce(tournament, league, ''Premier League'')';
  end if;
end $$;
update seasons set tournament = 'Premier League' where tournament is null;
alter table seasons alter column number set not null;
alter table seasons alter column tournament set not null;
alter table seasons alter column tournament set default 'Premier League';
alter table seasons
  drop column if exists name,
  drop column if exists start_year,
  drop column if exists club,
  drop column if exists league,
  drop column if exists league_position;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'seasons_number_key') then
    alter table seasons add constraint seasons_number_key unique (number);
  end if;
end $$;

-- ── Matches: tournament + entry order ──
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'matches' and column_name = 'competition') then
    alter table matches rename column competition to tournament;
  end if;
end $$;
alter table matches add column if not exists created_at timestamptz default now();
alter table matches alter column venue drop default;

-- ── Old per-season stats are replaced by match line-ups ──
drop table if exists player_season_stats cascade;

-- ── Club ──
alter table settings alter column club_name set default 'Leicester City';
update settings set club_name = 'Leicester City' where id = 1;

create table if not exists standings (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  team text not null,
  points int not null default 0,
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
  foreach t in array array['settings','seasons','standings','players','matches','match_players','trophies'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "public read" on %I', t);
    execute format('drop policy if exists "admin write" on %I', t);
    execute format('create policy "public read" on %I for select using (true)', t);
    execute format('create policy "admin write" on %I for all using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

alter table admins enable row level security;  -- no policies: invisible to the public API

grant usage on schema public to anon, authenticated;
grant select on settings, seasons, standings, players, matches, match_players, trophies to anon, authenticated;
grant insert, update, delete on settings, seasons, standings, players, matches, match_players, trophies to authenticated;
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
    insert into matches (season_id, tournament, opponent, goals_for, goals_against, venue, played_on, video_url, notes)
    values (
      (p_match->>'season_id')::uuid,
      nullif(p_match->>'tournament', ''),
      p_match->>'opponent',
      coalesce(nullif(p_match->>'goals_for', '')::int, 0),
      coalesce(nullif(p_match->>'goals_against', '')::int, 0),
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

-- Save a season + its league table in one go.
create or replace function save_season(p_season jsonb, p_teams jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid := nullif(p_season->>'id', '')::uuid;
begin
  if not is_admin() then raise exception 'Only admins can save seasons'; end if;

  if v_id is null then
    insert into seasons (number, tournament, notes)
    values ((p_season->>'number')::int, coalesce(nullif(p_season->>'tournament', ''), 'Premier League'), nullif(p_season->>'notes', ''))
    returning id into v_id;
  else
    update seasons set
      number     = (p_season->>'number')::int,
      tournament = coalesce(nullif(p_season->>'tournament', ''), 'Premier League'),
      notes      = nullif(p_season->>'notes', '')
    where id = v_id;
    if not found then raise exception 'Season not found'; end if;
    delete from standings where season_id = v_id;
  end if;

  insert into standings (season_id, team, points)
  select v_id, trim(x->>'team'), coalesce(nullif(x->>'points', '')::int, 0)
  from jsonb_array_elements(coalesce(p_teams, '[]'::jsonb)) x
  where trim(coalesce(x->>'team', '')) <> '';

  return v_id;
end $$;

revoke execute on function save_match(jsonb, jsonb) from public, anon;
revoke execute on function save_season(jsonb, jsonb) from public, anon;
grant execute on function save_match(jsonb, jsonb) to authenticated;
grant execute on function save_season(jsonb, jsonb) to authenticated;
