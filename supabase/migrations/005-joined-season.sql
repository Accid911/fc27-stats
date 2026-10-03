-- Migration 005 — the season a player joined the first team
-- Run AFTER 004. Run once in Supabase → SQL Editor → New query → Run. Keeps all your data.

alter table players add column if not exists joined_season_id uuid references seasons(id) on delete set null;
