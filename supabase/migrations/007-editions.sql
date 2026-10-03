-- Migration 007 — Youth Edition archive: 13 editions (FIFA 15 → FC 27)
-- Run AFTER 006. Run once in Supabase → SQL Editor → New query → Run.
-- Keeps all your data: everything that exists now is attached to Edition 13 (FC 27 · Leicester City),
-- which stays public. The other editions are empty and only visible to admins.

-- ───────────────────────── Editions ─────────────────────────
-- Every Youth Edition save (FIFA 15 → FC 27). The public site shows the "current" edition;
-- other editions are only visible to admins until they are made public.

create table if not exists editions (
  id uuid primary key default gen_random_uuid(),
  number int not null unique,
  game text not null,
  club text not null,
  crest_url text,
  youtube_url text,
  description text,
  is_public boolean not null default false,
  is_current boolean not null default false,
  created_at timestamptz default now()
);
create unique index if not exists one_current_edition on editions ((true)) where is_current;

insert into editions (number, game, club, is_public, is_current) values
  (1,  'FIFA 15', 'Newport County',      false, false),
  (2,  'FIFA 16', 'Notts County',        false, false),
  (3,  'FIFA 17', 'Cheltenham Town',     false, false),
  (4,  'FIFA 18', 'Forest Green Rovers', false, false),
  (5,  'FIFA 19', 'Oldham Athletic',     false, false),
  (6,  'FIFA 20', 'Salford City',        false, false),
  (7,  'FIFA 21', 'Bolton Wanderers',    false, false),
  (8,  'FIFA 22', 'Hartlepool United',   false, false),
  (9,  'FIFA 23', '1860 Munich',         false, false),
  (10, 'FC 24',   'Sutton United',       false, false),
  (11, 'FC 25',   'Bromley',             false, false),
  (12, 'FC 26',   'Cambridge United',    false, false),
  (13, 'FC 27',   'Leicester City',      true,  true)
on conflict (number) do nothing;

create or replace function current_edition_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from editions where is_current limit 1;
$$;
grant execute on function current_edition_id() to anon, authenticated;

-- Every table gets an edition. Existing rows all belong to the current edition (Leicester City).
do $$
declare t text;
begin
  foreach t in array array['seasons','players','standings','matches','match_players','player_moves','trophies'] loop
    execute format('alter table %I add column if not exists edition_id uuid references editions(id) on delete restrict', t);
    execute format('update %I set edition_id = current_edition_id() where edition_id is null', t);
    execute format('alter table %I alter column edition_id set default current_edition_id()', t);
    execute format('alter table %I alter column edition_id set not null', t);
    execute format('create index if not exists %I on %I (edition_id)', t || '_edition_idx', t);
  end loop;
end $$;

-- Season numbers restart in every edition
alter table seasons drop constraint if exists seasons_number_key;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'seasons_edition_number_key') then
    alter table seasons add constraint seasons_edition_number_key unique (edition_id, number);
  end if;
end $$;

-- Child rows always take the edition of their season / match / player
create or replace function edition_from_season() returns trigger language plpgsql as $$
begin
  select edition_id into new.edition_id from seasons where id = new.season_id;
  return new;
end $$;
create or replace function edition_from_match() returns trigger language plpgsql as $$
begin
  select edition_id into new.edition_id from matches where id = new.match_id;
  return new;
end $$;
create or replace function edition_from_player() returns trigger language plpgsql as $$
begin
  select edition_id into new.edition_id from players where id = new.player_id;
  return new;
end $$;
drop trigger if exists set_edition on standings;
create trigger set_edition before insert or update of season_id on standings for each row execute function edition_from_season();
drop trigger if exists set_edition on matches;
create trigger set_edition before insert or update of season_id on matches for each row execute function edition_from_season();
drop trigger if exists set_edition on trophies;
create trigger set_edition before insert or update of season_id on trophies for each row execute function edition_from_season();
drop trigger if exists set_edition on match_players;
create trigger set_edition before insert or update of match_id on match_players for each row execute function edition_from_match();
drop trigger if exists set_edition on player_moves;
create trigger set_edition before insert or update of player_id on player_moves for each row execute function edition_from_player();

-- Who can see what: public editions for everyone, everything for admins.
alter table editions enable row level security;
drop policy if exists "public read" on editions;
drop policy if exists "admin write" on editions;
create policy "public read" on editions for select using (is_public or (select is_admin()));
create policy "admin write" on editions for all using (is_admin()) with check (is_admin());
grant select on editions to anon, authenticated;
grant insert, update, delete on editions to authenticated;

do $$
declare t text;
begin
  foreach t in array array['seasons','players','standings','matches','match_players','player_moves','trophies'] loop
    execute format('drop policy if exists "public read" on %I', t);
    execute format(
      'create policy "public read" on %I for select using (edition_id in (select id from editions where is_public) or (select is_admin()))', t);
  end loop;
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
