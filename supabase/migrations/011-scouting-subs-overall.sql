-- Migration 011 — scouting, match episodes, substitutions, loan length, overall ratings.
-- Run AFTER 010. Supabase → SQL Editor → New query → paste everything → Run.
-- Only ADDS things: no existing row is changed or deleted. Safe to run more than once
-- (already ran an earlier version of this file? Just run it again — it adds what's missing).

-- ── 1. Scouting: every few in-game months the viewers pick a country to scout ──
create table if not exists scouting (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null default current_edition_id() references editions(id) on delete restrict,
  season_id uuid not null references seasons(id) on delete cascade,
  country text not null check (char_length(country) <= 60),
  suggested_by text check (char_length(suggested_by) <= 40),   -- the viewer who suggested it
  episode smallint check (episode between 1 and 9999),
  notes text check (char_length(notes) <= 300),
  created_at timestamptz default now()
);
create index if not exists scouting_edition_idx on scouting (edition_id);
create index if not exists scouting_season_idx on scouting (season_id);
drop trigger if exists set_edition on scouting;
create trigger set_edition before insert or update of season_id on scouting for each row execute function edition_from_season();

-- the scouting trip a player was found on (optional)
alter table players add column if not exists scouting_id uuid references scouting(id) on delete set null;

-- ── 2. Episode number of a match ──
alter table matches add column if not exists episode smallint;

-- ── 3. Substitutions (empty for old matches = "unknown") ──
alter table match_players add column if not exists started boolean;                 -- false = came on as a substitute
alter table match_players add column if not exists sub_for uuid references players(id) on delete set null; -- not used any more (kept so re-running is safe)
alter table match_players add column if not exists minute_on smallint;               -- minute he came on (optional)
alter table match_players add column if not exists came_off boolean;                 -- true = substituted off
alter table match_players add column if not exists minute_off smallint;              -- minute he came off (optional)

-- ── 4. Loan length ──
alter table player_moves add column if not exists loan_length text;

-- ── 5. Overall rating over time ──
create table if not exists player_overalls (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null default current_edition_id() references editions(id) on delete restrict,
  player_id uuid not null references players(id) on delete cascade,
  season_id uuid references seasons(id) on delete set null,
  moment text not null default 'during' check (moment in ('signed', 'start', 'during', 'end')),
  episode smallint check (episode between 1 and 9999),
  ovr smallint not null check (ovr between 1 and 99),
  created_at timestamptz default now()
);
create index if not exists player_overalls_edition_idx on player_overalls (edition_id);
create index if not exists player_overalls_player_idx on player_overalls (player_id);
drop trigger if exists set_edition on player_overalls;
create trigger set_edition before insert or update of player_id on player_overalls for each row execute function edition_from_player();

-- checks on the new columns (added only once)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'matches_episode_check') then
    alter table matches add constraint matches_episode_check check (episode between 1 and 9999);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'match_players_minute_on_check') then
    alter table match_players add constraint match_players_minute_on_check check (minute_on between 1 and 130);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'match_players_minute_off_check') then
    alter table match_players add constraint match_players_minute_off_check check (minute_off between 1 and 130);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'player_moves_loan_length_check') then
    alter table player_moves add constraint player_moves_loan_length_check check (loan_length in ('short', '1 year', '2 years'));
  end if;
end $$;

-- Who can see what (same rules as everything else)
do $$
declare t text;
begin
  foreach t in array array['scouting', 'player_overalls'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "public read" on %I', t);
    execute format('drop policy if exists "admin write" on %I', t);
    execute format(
      'create policy "public read" on %I for select using (edition_id in (select id from editions where is_public) or (select is_admin()))', t);
    execute format('create policy "admin write" on %I for all using (is_admin()) with check (is_admin())', t);
    execute format('grant select on %I to anon, authenticated', t);
    execute format('grant insert, update, delete on %I to authenticated', t);
  end loop;
end $$;

-- Save a match + its line-up in one go (now also the episode and substitutions)
create or replace function save_match(p_match jsonb, p_players jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid := nullif(p_match->>'id', '')::uuid;
begin
  if not is_admin() then raise exception 'Only admins can save matches'; end if;

  if v_id is null then
    insert into matches (season_id, tournament, opponent, goals_for, goals_against, pens_for, pens_against, venue, played_on, video_url, notes, episode)
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
      nullif(p_match->>'notes', ''),
      nullif(p_match->>'episode', '')::smallint
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
      notes         = nullif(p_match->>'notes', ''),
      episode       = nullif(p_match->>'episode', '')::smallint
    where id = v_id;
    if not found then raise exception 'Match not found'; end if;
    delete from match_players where match_id = v_id;
  end if;

  insert into match_players (match_id, player_id, rating, goals, assists, potm, started, minute_on, came_off, minute_off)
  select v_id,
         (x->>'player_id')::uuid,
         nullif(x->>'rating', '')::numeric,
         coalesce(nullif(x->>'goals', '')::int, 0),
         coalesce(nullif(x->>'assists', '')::int, 0),
         coalesce(nullif(x->>'potm', '')::boolean, false),
         nullif(x->>'started', '')::boolean,
         nullif(x->>'minute_on', '')::smallint,
         nullif(x->>'came_off', '')::boolean,
         nullif(x->>'minute_off', '')::smallint
  from jsonb_array_elements(coalesce(p_players, '[]'::jsonb)) x;

  return v_id;
end $$;

revoke execute on function save_match(jsonb, jsonb) from public, anon;
grant execute on function save_match(jsonb, jsonb) to authenticated;

-- Make the API (PostgREST) pick up the new tables and columns straight away
notify pgrst, 'reload schema';

-- Quick check: every row below should say "ok"
select item, case when ok then 'ok' else 'MISSING' end as status from (values
  ('scouting table',            exists (select 1 from information_schema.tables  where table_name = 'scouting')),
  ('players.scouting_id',       exists (select 1 from information_schema.columns where table_name = 'players' and column_name = 'scouting_id')),
  ('matches.episode',           exists (select 1 from information_schema.columns where table_name = 'matches' and column_name = 'episode')),
  ('match_players.started',     exists (select 1 from information_schema.columns where table_name = 'match_players' and column_name = 'started')),
  ('match_players.came_off',    exists (select 1 from information_schema.columns where table_name = 'match_players' and column_name = 'came_off')),
  ('player_moves.loan_length',  exists (select 1 from information_schema.columns where table_name = 'player_moves' and column_name = 'loan_length')),
  ('player_overalls table',     exists (select 1 from information_schema.tables  where table_name = 'player_overalls'))
) as v(item, ok);
