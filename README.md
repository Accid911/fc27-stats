# SparringDK’s Youth Edition — Leicester City FC27 Career Stats

A fan-made stats site for [SparringDK](https://www.youtube.com/@SparringDK)’s FC27 career mode series *The Youth Edition*: Leicester City, academy players only.

- **Public site** — overview with records and leaderboards, seasons (with league tables), matches (with line-ups), players. Anyone can view.
- **Admin (`/admin`)** — you and the creator sign in to add players, seasons and matches. All player stats are calculated from the match line-ups.

Built with **Next.js** + **Supabase** (free Postgres + login), hosted on **Vercel**.

Without Supabase connected, the site runs in **demo mode** with sample data on your own computer, so you can try it right away. On Vercel it never shows demo data: if the database can't be reached, visitors see a “stats temporarily unavailable” page instead.

---

## 1. Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. (Needs Node 20+.)

## 2. Push to GitHub

Create an **empty** repo on GitHub (no README, no .gitignore), then in this folder:

```bash
git remote add origin https://github.com/<your-username>/fc27-stats.git
git branch -M main
git push -u origin main
```

## Upgrading an existing database

Already have a database? Run the migration files you haven't run yet, in order, in
**SQL Editor → New query → Run** (each one keeps your data):

1. [`002-leicester-youth.sql`](supabase/migrations/002-leicester-youth.sql) — match line-ups & league tables
2. [`003-transfers-cups.sql`](supabase/migrations/003-transfers-cups.sql) — transfers & loans, cups per season, removes player age
3. [`004-penalties-table.sql`](supabase/migrations/004-penalties-table.sql) — penalty shoot-outs, full league table (W/D/L/GF/GA)
4. [`005-joined-season.sql`](supabase/migrations/005-joined-season.sql) — the season each player joined the first team
5. [`006-cup-results.sql`](supabase/migrations/006-cup-results.sql) — cup results per season (cup wins & league titles become automatic trophies)
6. [`007-editions.sql`](supabase/migrations/007-editions.sql) — all 13 Youth Editions (FIFA 15 Newport County → FC 27 Leicester City). Everything already in the database becomes edition #13 (Leicester); the 12 older editions start empty and **hidden**.
7. [`008-catch-up.sql`](supabase/migrations/008-catch-up.sql) — safe repair, run after 007: adds anything from 005/006 that was skipped and refreshes the API. Can be run any number of times. (After 007, don't run 006 itself anymore — use 008.)
8. [`009-kit-numbers.sql`](supabase/migrations/009-kit-numbers.sql) — kit numbers for players (optional per player)

## 3. Set up Supabase (the database)

1. Create a free project at https://supabase.com.
2. Open **SQL Editor → New query**, paste everything from [`supabase/schema.sql`](supabase/schema.sql).
   **Before running**, check the two emails at the bottom (yours + the creator's). Click **Run**.
3. **Authentication → Users → Add user → Create new user**: create an account for you and one for the creator (same emails as above, tick *Auto Confirm User*).
4. **Authentication → Sign In / Providers**: turn **off** “Allow new users to sign up”, so nobody else can create an account.
5. **Project Settings → API** (or *API Keys*): copy the **Project URL** and the **publishable** (or legacy *anon*) key.

To try locally with the real database, copy `.env.example` to `.env.local` and paste the two values in.

> Only emails in the `admins` table can edit. Add/remove editors any time in **Table Editor → admins**.

## 4. Deploy on Vercel

1. https://vercel.com → **Add New… → Project** → import the GitHub repo.
2. Under **Environment Variables** add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the publishable/anon key)
3. **Deploy**. Every `git push` redeploys automatically.

The publishable/anon key is safe to be public — the database rules (Row Level Security) only allow reading for everyone and writing for admins.

---

## What's tracked

| Table | What |
|---|---|
| `editions` | The 13 Youth Editions: game, club, crest, YouTube link, intro, public or hidden |
| `settings` | Club name, creator name, tagline, YouTube link |
| `players` | Name, kit number (optional), position, country, season he joined the first team |
| `player_moves` | Transfers & loans: sold / loaned out / back from loan / released, club, fee, season, date |
| `seasons` | Season number, league (EFL League Two → Premier League), cups played and how far we got in each, notes |
| `standings` | The league table for a season: team, W, D, L, GF, GA, points |
| `matches` | Season, tournament, opponent, score, penalties (cup draws), home/away, date, video link |
| `match_players` | Who played in a match: rating, goals, assists, Player of the Match |
| `trophies` | Extra trophies only — league titles (top of the table) and cup wins (“Winner”) are automatic |

## Using the admin

- **Players** — fill in name, position, country, the season he joined (defaults to the latest) and press Enter. Clean sheets are counted automatically for goalkeepers and defenders. Click **Edit / transfer** to change details or to **Sell**, **Loan out**, bring **Back from loan** or **Release** a player (club, fee like `12.5m` or `850k`, season, date). Undo a move by removing it from the history.
- **Seasons** — *New season* pre-fills the next number, last season's league, cups and teams. Pick the league, click the cups played and set how far you got (*Winner* puts the cup in the trophy cabinet), fill in W/D/L/GF/GA/points (points auto-fill as 3×W + D), or **Paste a list** (`Arsenal 38 26 6 6 80 30 50 84` or just `Arsenal 84`). Leicester's row can be filled in from the logged league matches.
- **Matches** — the tournament list is the season's league + cups. Pick the opponent and home/away (away games show the opponent first), type the score — a drawn cup match shows penalty boxes — click players to add them (or **Same players as last match**), then set each player's rating, goals (+/−), assists (+/−) and tap ★ for Player of the Match.

- **Excel download (public)** — anyone can download all stats until now as an Excel file: button on the Records page and in the footer (`/api/export`).
- **Backup** — download a full backup of every edition (.json) or a readable spreadsheet (.xlsx); restore a .json backup if something goes wrong. The admin reminds you when the last backup is more than 14 days old.

## The Youth Edition archive (older editions)

SparringDK did a Youth Edition every year since FIFA 15. Each one works exactly like the Leicester career (players, seasons, matches, records), on its own pages under **`/editions`**:

- `/editions` — all editions · `/editions/1` … `/editions/12` — one edition · `/editions/all-time` — everything together.
- The main site (`/`, `/players`, …) **only** shows the current edition (Leicester) and has no links to the archive.
- Older editions are **hidden** until you make them public: anonymous visitors (and search engines) can't read their data at all — the database blocks it. To see hidden pages, sign in on `/admin` first, then open `/editions` in the same browser.

**Entering data for an older edition:** in the admin, pick the edition at the top (“Editing #1 · FIFA 15 · Newport County”). Every tab — Players, Seasons, Matches, trophies — now works on that edition only. Switch back to #13 for Leicester.

**Going public:** Admin → **Editions** → *Details* → tick **Public** → *Save edition*. There you can also add a crest image URL, a YouTube link and a short intro. Make them public one by one, or all at once when everything is filled in.

## Speed & caching

Pages read the data from a cache, so they stay fast as the career grows. After every save in the admin, the cache is refreshed straight away (`app/api/revalidate`); otherwise it refreshes at least every 5 minutes.

## Project structure

```
app/                 pages (overview, records, seasons, matches, players + transfers, about, admin)
app/editions/        the archive of older Youth Editions
views/               page bodies shared by the main site and the archive
components/          tables, leaderboards, admin editors
lib/server-data.js   loading + caching (server only)
lib/data.js          all stat calculations (records, streaks, leaders, honours)
lib/admin-api.js     save/delete for the admin panel
lib/demo-data.js     sample data for demo mode
supabase/schema.sql  database setup (fresh install)
supabase/migrations/ upgrades for an existing database
```

## Ideas for next versions

- Rating progression chart per player
- Player photos
