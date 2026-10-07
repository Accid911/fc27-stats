-- Migration 009 — kit numbers (each episode a viewer picks the number of one player)
-- Run AFTER 008. Supabase → SQL Editor → New query → paste → Run. Keeps all your data; safe to run again.
-- Optional: players without a number simply have none.

alter table players add column if not exists kit_number smallint;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'players_kit_number_check') then
    alter table players add constraint players_kit_number_check check (kit_number between 1 and 99);
  end if;
end $$;

notify pgrst, 'reload schema';
