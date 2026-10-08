-- Migration 010 — who picked the kit number (viewer name + episode)
-- Run AFTER 009. Supabase → SQL Editor → New query → paste → Run. Keeps all your data; safe to run again.

-- Kit number credit: the viewer who picked it and in which episode (both optional)
alter table players add column if not exists kit_chosen_by text;
alter table players add column if not exists kit_chosen_episode smallint;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'players_kit_chosen_by_len') then
    alter table players add constraint players_kit_chosen_by_len check (char_length(kit_chosen_by) <= 40);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'players_kit_chosen_episode_check') then
    alter table players add constraint players_kit_chosen_episode_check check (kit_chosen_episode between 1 and 9999);
  end if;
end $$;

notify pgrst, 'reload schema';
