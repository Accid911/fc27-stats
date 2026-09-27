-- Migration 004 — penalty shoot-outs + full league table (W/D/L/GF/GA)
-- Run AFTER 003. Run once in Supabase → SQL Editor → New query → Run. Keeps all your data.

alter table matches add column if not exists pens_for int;
alter table matches add column if not exists pens_against int;

alter table standings add column if not exists won int;
alter table standings add column if not exists drawn int;
alter table standings add column if not exists lost int;
alter table standings add column if not exists gf int;
alter table standings add column if not exists ga int;

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
    insert into seasons (number, tournament, cups, notes)
    values ((p_season->>'number')::int, coalesce(nullif(p_season->>'tournament', ''), 'Premier League'), v_cups, nullif(p_season->>'notes', ''))
    returning id into v_id;
  else
    update seasons set
      number     = (p_season->>'number')::int,
      tournament = coalesce(nullif(p_season->>'tournament', ''), 'Premier League'),
      cups       = v_cups,
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
