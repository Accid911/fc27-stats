# FC27 Career Stats

A fan-made stats site for an FC27 Career Mode series.

- **Public site** — overview, seasons, players, trophies. Anyone can view.
- **Admin (`/admin`)** — you and the creator sign in to add seasons, players, per-season player stats, matches and trophies.

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

## 3. Set up Supabase (the database)

1. Create a free project at https://supabase.com.
2. Open **SQL Editor → New query**, paste everything from [`supabase/schema.sql`](supabase/schema.sql).
   **Before running**, replace `you@example.com` and `creator@example.com` at the bottom with the two real emails. Click **Run**.
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
| `seasons` | Name (2026/27), club, league, final position, notes |
| `players` | Name, position, nation, shirt #, OVR/POT, in squad or left |
| `player_season_stats` | Apps, goals, assists, clean sheets, MOTM, cards, avg rating — per player per season |
| `matches` | Date, competition, opponent, H/A, score, video link |
| `trophies` | Trophy name per season |

## Project structure

```
app/                 pages (overview, seasons, players, admin)
components/          tables, leaderboards, admin editors
lib/data.js          loading + stat calculations
lib/admin-api.js     save/delete for the admin panel
lib/demo-data.js     sample data for demo mode
supabase/schema.sql  database setup
```

## Ideas for next versions

- Per-match player stats (goals/assists per game) instead of season totals
- Transfers (in/out, fees) and youth academy tracking
- Charts: goals per season, rating progression
- Player photos / club badges
