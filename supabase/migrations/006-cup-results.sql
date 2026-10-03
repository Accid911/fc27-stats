-- Migration 006 — cup results per season (trophies for cups/league are no longer entered twice)
-- Run AFTER 005. Run once in Supabase → SQL Editor → New query → Run. Keeps all your data.

alter table seasons add column if not exists cup_results jsonb not null default '{}'::jsonb;

-- Cup trophies already entered → "Winner" in that season's cup results, then remove the duplicate trophy.
update seasons s
set cup_results = s.cup_results || coalesce(
  (select jsonb_object_agg(t.name, 'Winner') from trophies t where t.season_id = s.id and t.name = any (s.cups)),
  '{}'::jsonb
);
delete from trophies t using seasons s where t.season_id = s.id and t.name = any (s.cups);

-- League-title trophies are now automatic when Leicester finish top of the table.
-- Only removed when the entered table really has Leicester on top (otherwise kept as an extra trophy).
delete from trophies t
using seasons s
where t.season_id = s.id
  and lower(t.name) in (lower(s.tournament), lower(s.tournament) || ' title', lower(s.tournament) || ' champions')
  and exists (
    select 1 from standings st
    where st.season_id = s.id and st.team ilike '%leicester%'
      and st.points > all (select o.points from standings o where o.season_id = s.id and o.id <> st.id)
  );

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

revoke execute on function save_season(jsonb, jsonb) from public, anon;
grant execute on function save_season(jsonb, jsonb) to authenticated;
