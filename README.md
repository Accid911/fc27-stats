# Leicester City Youth — FC27 Career Stats

A fan-made stats site for an FC27 Career Mode series: Leicester City, academy players only.

- **Public site** — overview with records and leaderboards, seasons (with league tables), matches (with line-ups), players. Anyone can view.
- **Admin (`/admin`)** — you and the creator sign in to add players, seasons and matches. All player stats are calculated from the match line-ups.

Built with **Next.js** + **Supabase** (free Postgres + login), hosted on **Vercel**.

Without Supabase connected, the site runs in **demo mode** with sample data, so you can try it right away.

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
| `settings` | Club name, creator name, tagline, YouTube link |
| `players` | Name, position, country |
| `player_moves` | Transfers & loans: sold / loaned out / back from loan / released, club, fee, season, date |
| `seasons` | Season number, league (EFL League Two → Premier League), cups played, notes |
| `standings` | The league table for a season: team + points |
| `matches` | Season, tournament, opponent, score, home/away, date, video link |
| `match_players` | Who played in a match: rating, goals, assists, Player of the Match |
| `trophies` | Trophy name per season |

## Using the admin

- **Players** — fill in name, position, country and press Enter. Click **Edit / transfer** to change details or to **Sell**, **Loan out**, bring **Back from loan** or **Release** a player (club, fee like `12.5m` or `850k`, season, date). Undo a move by removing it from the history.
- **Seasons** — *New season* pre-fills the next number, last season's league, cups and teams. Pick the league, click the cups played, type the points (or **Paste a list**, `Arsenal 84` per line).
- **Matches** — the tournament list is the season's league + cups. Pick the opponent, type the score, click players to add them (or **Same players as last match**), then set each player's rating, goals (+/−), assists (+/−) and tap ★ for Player of the Match.

## Project structure

```
app/                 pages (overview, seasons, players, admin)
components/          tables, leaderboards, admin editors
lib/data.js          loading + all stat calculations (records, streaks, leaders)
lib/admin-api.js     save/delete for the admin panel
lib/demo-data.js     sample data for demo mode
supabase/schema.sql  database setup (fresh install)
supabase/migrations/ upgrades for an existing database
```

## Ideas for next versions

- Rating progression chart per player
- Player photos
