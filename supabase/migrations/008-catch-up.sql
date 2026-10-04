-- Migration 008 — catch-up / repair. Safe to run any number of times, keeps all your data.
-- Run AFTER 007. Supabase → SQL Editor → New query → paste everything → Run.
--
-- Adds anything from migrations 005 and 006 that may have been skipped (joined season, cup results),
-- re-installs the edition-aware save_season, and tells the API to reload its list of columns.
-- ⚠ Do NOT run 006 itself after 007: it would replace save_season with the old version
--   (new seasons of older editions would land in Leicester). This file does it the right way.

do $$
declare had_cup_results boolean;
begin
  -- 005: the season a player joined the first team
  alter table players add column if not exists joined_season_id uuid references seasons(id) on delete set null;

  -- 006: cup results per season (only converts old cup trophies when the column is new)
  select exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'seasons' and column_name = 'cup_results')
    into had_cup_results;
  if not had_cup_results then
    alter table seasons add column cup_results jsonb not null default '{}'::jsonb;
    update seasons s
    set cup_results = s.cup_results || coalesce(
      (select jsonb_object_agg(t.name, 'Winner') from trophies t where t.season_id = s.id and t.name = any (s.cups)),
      '{}'::jsonb
    );
    delete from trophies t using seasons s where t.season_id = s.id and t.name = any (s.cups);
    delete from trophies t
    using seasons s
    where t.season_id = s.id
      and lower(t.name) in (lower(s.tournament), lower(s.tournament) || ' title', lower(s.tournament) || ' champions')
      and exists (
        select 1 from standings st
        where st.season_id = s.id and st.team ilike '%leicester%'
          and st.points > all (select o.points from standings o where o.season_id = s.id and o.id <> st.id)
      );
  end if;
end $$;

-- Save a season (league + cups) and its league table in one go. New seasons go to the given edition (default: current).
create or replace function save_season(p_season jsonb, p_teams jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid := nullif(p_season->>'id', '')::uuid;
  v_edition uuid := coalesce(nullif(p_season->>'edition_id', '')::uuid, current_edition_id());
  v_cups text[] := coalesce(
    (select array_agg(trim(c)) from jsonb_array_elements_text(coalesce(p_season->'cups', '[]'::jsonb)) c where trim(c) <> ''),
    '{}'
  );
begin
  if not is_admin() then raise exception 'Only admins can save seasons'; end if;

  if v_id is null then
    insert into seasons (edition_id, number, tournament, cups, cup_results, notes)
    values (v_edition, (p_season->>'number')::int, coalesce(nullif(p_season->>'tournament', ''), 'Premier League'), v_cups,
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

revoke execute on function save_season(jsonb, jsonb) from public, anon;
grant execute on function save_season(jsonb, jsonb) to authenticated;

-- Make the API (PostgREST) pick up the new columns straight away
notify pgrst, 'reload schema';

-- Quick check: every row below should say "ok"
select 'players.joined_season_id' as item,
       case when exists (select 1 from information_schema.columns where table_name = 'players' and column_name = 'joined_season_id') then 'ok' else 'MISSING' end as status
union all
select 'seasons.cup_results',
       case when exists (select 1 from information_schema.columns where table_name = 'seasons' and column_name = 'cup_results') then 'ok' else 'MISSING' end
union all
select 'players.edition_id (007)',
       case when exists (select 1 from information_schema.columns where table_name = 'players' and column_name = 'edition_id') then 'ok' else 'MISSING — run 007 first' end
union all
select 'editions (007)', (select count(*)::text || ' editions' from editions);
