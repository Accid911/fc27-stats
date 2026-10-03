import Link from 'next/link';
import { loadAll } from '@/lib/server-data';
import { buildModel, teamRecord, streaks, leagueTable, playerStats, topBy, recordBook, countBy, positionGroup, POSITION_GROUPS, ordinal, seasonLabel, formatMoney, MOVE_LABEL, fixture, fixtureText, funFacts, allHonours } from '@/lib/data';
import Leaderboard from '@/components/Leaderboard';
import DemoNotice from '@/components/DemoNotice';
import { BarList, ColumnChart } from '@/components/Charts';
import { Kpi, Mini, Record, MatchRecord, PlayerRecord, plural } from '@/components/StatCards';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Records',
  description: 'Record book, fun facts, all-time leaders and charts from SparringDK’s Youth Edition career.',
};

export default async function RecordsPage() {
  const data = await loadAll();
  const model = buildModel(data);
  const { settings } = data;
  const rec = teamRecord(model.matches);
  const run = streaks(model.matches);
  const stats = playerStats(model);
  const book = recordBook(model);
  const fun = funFacts(model);
  const last5 = model.matches.slice(-5);

  const latest = model.seasons[model.seasons.length - 1];
  const latestMatches = latest ? model.matches.filter((m) => m.season_id === latest.id) : [];
  const latestRec = teamRecord(latestMatches);
  const latestTable = latest ? leagueTable(model, latest.id) : null;
  const latestStats = latest ? playerStats(model, latestMatches) : [];
  const latestTop = topBy(latestStats, 'goals', 1)[0];
  const latestBest = topBy(latestStats, 'avg_rating', 1, (p) => p.rated >= 3)[0];

  const minApps = Math.max(3, Math.ceil(model.matches.length * 0.2));
  const used = stats.filter((p) => p.apps > 0);
  const statusOf = (p) => model.statusById[p.id]?.status;
  const squad = data.players.filter((p) => statusOf(p) === 'squad');
  const onLoan = data.players.filter((p) => statusOf(p) === 'loan');
  const sales = model.moves.filter((mv) => mv.type === 'sold');
  const income = sales.reduce((a, mv) => a + Number(mv.fee || 0), 0);
  const recordSale = [...sales].filter((mv) => mv.fee != null).sort((a, b) => Number(b.fee) - Number(a.fee))[0];
  const recentMoves = [...model.moves].reverse().slice(0, 5);

  const goalsBySeason = model.seasons.map((s) => {
    const r = teamRecord(model.matches.filter((m) => m.season_id === s.id));
    return { label: `S${s.number}`, value: r.GF, games: r.P };
  });
  const pointsBySeason = model.seasons
    .map((s) => ({ s, t: leagueTable(model, s.id).club }))
    .filter((x) => x.t)
    .map(({ s, t }) => ({ label: `S${s.number}`, value: t.points, pos: t.pos, league: s.tournament }));

  const byCountry = countBy(squad, (p) => p.country);
  const countryRows = byCountry.length > 8
    ? [...byCountry.slice(0, 7), { label: `Other (${byCountry.length - 7})`, value: byCountry.slice(7).reduce((a, r) => a + r.value, 0) }]
    : byCountry;
  const byGroup = Object.keys(POSITION_GROUPS).map((g) => ({
    label: POSITION_GROUPS[g],
    value: squad.filter((p) => positionGroup(p.position) === g).length,
  }));

  return (
    <>
      <DemoNotice demo={data.demo} />
      <div className="eyebrow">All-time</div>
      <h1 style={{ marginBottom: 8 }}>Records</h1>
      <p className="muted" style={{ marginBottom: 8 }}>Everything worth bragging about — updated after every match.</p>

      <section className="section">
        <h2>Record book</h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <MatchRecord label="Biggest win" m={book.biggestWin} clubName={model.clubName} />
          <MatchRecord label="Heaviest defeat" m={book.worstLoss} clubName={model.clubName} />
          <MatchRecord label="Highest-scoring game" m={book.mostGoals} clubName={model.clubName} />
          <Record label="Longest winning run" big={plural(run.bestWin, 'match')} sub="in a row" />
          <Record label="Longest unbeaten run" big={plural(run.bestUnbeaten, 'match')} sub="without losing" />
          <PlayerRecord label="Best match rating" r={book.bestRating} fmt={(v) => v.toFixed(1)} />
          <PlayerRecord label="Most goals in one game" r={book.mostInGame} />
          <Record
            label="Hat-tricks"
            big={book.hatTricks.length}
            sub={book.hatTricks.length ? book.hatTricks.slice(-3).map((h) => h.player?.name).join(', ') : 'Still waiting…'}
          />
        </div>
      </section>

      <section className="section">
        <h2>Fun facts</h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <Record label="Home record" big={`${fun.home.W}-${fun.home.D}-${fun.home.L}`} sub={fun.home.P ? `${fun.home.winPct}% won · ${fun.home.GF} goals scored` : 'No home games yet'} />
          <Record label="Away record" big={`${fun.away.W}-${fun.away.D}-${fun.away.L}`} sub={fun.away.P ? `${fun.away.winPct}% won · ${fun.away.GF} goals scored` : 'No away games yet'} />
          <Record
            label="Penalty shoot-outs"
            big={fun.shootouts.played ? `${fun.shootouts.won} / ${fun.shootouts.played}` : '—'}
            sub={fun.shootouts.played ? 'won' : 'Never needed one'}
          />
          <Record
            label="Most common scoreline"
            big={fun.scoreline ? fun.scoreline.score : '—'}
            sub={fun.scoreline ? `${plural(fun.scoreline.times, 'time')} (${model.clubName.split(' ')[0]} first)` : 'No matches yet'}
          />
          <Record
            label="Favourite opponent"
            big={fun.favourite ? fun.favourite.team : '—'}
            sub={fun.favourite ? `W${fun.favourite.W} D${fun.favourite.D} L${fun.favourite.L}` : 'No wins yet'}
          />
          <Record
            label="Bogey team"
            big={fun.bogey ? fun.bogey.team : '—'}
            sub={fun.bogey ? `W${fun.bogey.W} D${fun.bogey.D} L${fun.bogey.L}` : 'Unbeaten by everyone!'}
          />
          <Record
            label="Longest scoring streak"
            big={fun.scoringStreak ? plural(fun.scoringStreak.value, 'game') : '—'}
            sub={fun.scoringStreak ? <Link href={`/players/${fun.scoringStreak.player.id}`}>{fun.scoringStreak.player.name}</Link> : 'Scoring in a row'}
          />
          <Record
            label="Most goals in a season"
            big={fun.seasonGoals ? fun.seasonGoals.value : '—'}
            sub={fun.seasonGoals ? <><Link href={`/players/${fun.seasonGoals.player.id}`}>{fun.seasonGoals.player.name}</Link> · {seasonLabel(fun.seasonGoals.season)}</> : '—'}
          />
          <Record
            label="Most POTM in a season"
            big={fun.seasonPotm ? fun.seasonPotm.value : '—'}
            sub={fun.seasonPotm ? <><Link href={`/players/${fun.seasonPotm.player.id}`}>{fun.seasonPotm.player.name}</Link> · {seasonLabel(fun.seasonPotm.season)}</> : '—'}
          />
          <Record label="Clean-sheet run" big={plural(fun.cleanSheetRun, 'match')} sub="without conceding" />
          <Record label="Scoring run" big={plural(fun.scoringRun, 'match')} sub="in a row with a goal" />
          <Record label="Different goalscorers" big={fun.differentScorers} sub={`out of ${used.length} academy players used`} />
          <Record
            label="Best team performance"
            big={fun.bestTeamRating ? fun.bestTeamRating.value.toFixed(1) : '—'}
            sub={fun.bestTeamRating ? <>avg rating · <Link href={`/matches/${fun.bestTeamRating.match.id}`}>{fixtureText(fun.bestTeamRating.match, model.clubName.split(' ')[0])}</Link></> : 'Needs 5+ rated players'}
          />
          <Record label="Opponents faced" big={fun.opponentsFaced} sub="different teams" />
        </div>
      </section>

      <section className="section">
        <h2>All-time leaders</h2>
        <div className="grid grid-2">
          <Leaderboard title="Top scorers" rows={topBy(stats, 'goals')} valueKey="goals" sub={(p) => `${p.apps} apps`} />
          <Leaderboard title="Most assists" rows={topBy(stats, 'assists')} valueKey="assists" sub={(p) => `${p.apps} apps`} />
          <Leaderboard title="Goal contributions (G+A)" rows={topBy(stats, 'ga')} valueKey="ga" sub={(p) => `${p.goals}G · ${p.assists}A`} />
          <Leaderboard title="Player of the Match awards" rows={topBy(stats, 'potm')} valueKey="potm" sub={(p) => `${p.apps} apps`} />
          <Leaderboard
            title="Best average rating"
            rows={topBy(stats, 'avg_rating', 5, (p) => p.rated >= minApps)}
            valueKey="avg_rating"
            format={(v) => v.toFixed(1)}
            sub={(p) => `${p.rated} rated games`}
            empty={`Needs ${minApps}+ rated games.`}
          />
          <Leaderboard title="Most appearances" rows={topBy(stats, 'apps')} valueKey="apps" sub={(p) => p.country || ''} />
          <Leaderboard
            title="Clean sheets (GK & defenders)"
            rows={topBy(stats, 'cs')}
            valueKey="cs"
            sub={(p) => `${p.apps} apps`}
            empty="No clean sheets yet."
          />
          <Leaderboard
            title="Best win rate"
            rows={topBy(stats, 'winPct', 5, (p) => p.apps >= minApps)}
            valueKey="winPct"
            format={(v) => `${v}%`}
            sub={(p) => `${p.apps} apps`}
            empty={`Needs ${minApps}+ appearances.`}
          />
          <Leaderboard title="Hat-tricks" rows={topBy(stats, 'hatTricks')} valueKey="hatTricks" sub={(p) => `${p.goals} goals in total`} empty="No hat-tricks yet." />
        </div>
      </section>

      <section className="section">
        <h2>By season</h2>
        <div className="grid grid-2">
          <div className="card">
            <h3 style={{ marginBottom: 4 }}>Goals scored per season</h3>
            <ColumnChart rows={goalsBySeason} tip={(r) => `${r.label}: ${r.value} goals in ${r.games} games`} />
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 4 }}>Academy intake per season</h3>
            <ColumnChart rows={fun.intake} tip={(r) => `${r.label}: ${plural(r.value, 'youngster')} joined the first team`} />
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 4 }}>League points per season</h3>
            <ColumnChart rows={pointsBySeason} tip={(r) => `${r.label}: ${r.value} pts · finished ${ordinal(r.pos)} in the ${r.league}`} />
          </div>
        </div>
      </section>

      <section className="section">
        <h2>The academy squad</h2>
        <div className="grid grid-kpi" style={{ marginBottom: 16 }}>
          <Kpi value={squad.length} label="Players in squad" />
          <Kpi value={onLoan.length} label="Out on loan" />
          <Kpi value={sales.length} label="Players sold" />
          <Kpi value={formatMoney(income, model.currency)} label="Transfer income" gold />
          <Kpi value={byCountry.length} label="Countries in squad" />
        </div>
        <div className="grid grid-2">
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Where they’re from</h3>
            <BarList rows={countryRows} tip={(r) => `${r.label}: ${plural(r.value, 'player')}`} />
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Squad by position</h3>
            <BarList rows={byGroup} tip={(r) => `${r.label}: ${r.value}`} />
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Goals by position</h3>
            <BarList rows={fun.goalsByGroup} tip={(r) => `${r.label}: ${plural(r.value, 'goal')}`} />
          </div>
        </div>
      </section>
    </>
  );
}
