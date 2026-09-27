-- Migration 003 — transfers & loans, cups per season, no more player age
-- Run AFTER 002. Run once in Supabase → SQL Editor → New query → Run.
-- Keeps all your data. Players that were marked "left" become "released".

-- ── Transfers & loans ──
create table if not exists player_moves (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  type text not null check (type in ('sold', 'loan', 'loan_return', 'released')),
  club text,                                          -- buying club / loan club
  fee numeric(14,2),                                  -- transfer fee or loan fee
  season_id uuid references seasons(id) on delete set null,
  moved_on date,
  notes text,
  created_at timestamptz default now()
);
create index if not exists player_moves_player on player_moves (player_id);

-- Old "in squad" tick box → a "released" move, then drop it (status now comes from moves)
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'players' and column_name = 'is_active') then
    execute 'insert into player_moves (player_id, type) select id, ''released'' from players where not is_active';
    alter table players drop column is_active;
  end if;
end $$;
alter table players drop column if exists age;

-- ── Seasons: league + cups ──
alter table seasons add column if not exists cups text[] not null default '{}';
update seasons set tournament = 'EFL League Two' where lower(tournament) in ('league two', 'efl2', 'efl league 2');
update seasons set tournament = 'EFL League One' where lower(tournament) in ('league one', 'efl1', 'efl league 1');

-- ── Money ──
alter table settings add column if not exists currency text not null default '£';

-- ── Security for the new table ──
alter table player_moves enable row level security;
drop policy if exists "public read" on player_moves;
drop policy if exists "admin write" on player_moves;
create policy "public read" on player_moves for select using (true);
create policy "admin write" on player_moves for all using (is_admin()) with check (is_admin());
grant select on player_moves to anon, authenticated;
grant insert, update, delete on player_moves to authenticated;

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

  insert into standings (season_id, team, points)
  select v_id, trim(x->>'team'), coalesce(nullif(x->>'points', '')::int, 0)
  from jsonb_array_elements(coalesce(p_teams, '[]'::jsonb)) x
  where trim(coalesce(x->>'team', '')) <> '';

  return v_id;
end $$;

revoke execute on function save_season(jsonb, jsonb) from public, anon;
grant execute on function save_season(jsonb, jsonb) to authenticated;
