import Link from 'next/link';
import {
  loadAll, buildModel, teamRecord, streaks, leagueTable, playerStats, topBy, recordBook,
  countBy, positionGroup, POSITION_GROUPS, ordinal, seasonLabel, formatMoney, MOVE_LABEL,
} from '@/lib/data';
import Logo from '@/components/Logo';
import Leaderboard from '@/components/Leaderboard';
import DemoNotice from '@/components/DemoNotice';
import { BarList, ColumnChart } from '@/components/Charts';

export const dynamic = 'force-dynamic';

const RUN = { W: 'win', D: 'draw', L: 'loss' };
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : /(s|x|ch|sh)$/.test(word) ? 'es' : 's'}`;

export default async function Home() {
  const data = await loadAll();
  const model = buildModel(data);
  const { settings } = data;
  const rec = teamRecord(model.matches);
  const run = streaks(model.matches);
  const stats = playerStats(model);
  const book = recordBook(model);
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

      <section className="card hero">
        <div className="eyebrow" style={{ color: 'var(--gold)' }}>
          FC27 Career Mode · Academy players only{settings.creator_name ? ` · ${settings.creator_name}` : ''}
        </div>
        <div className="hero-row">
          <div>
            <h1>{model.clubName}</h1>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Youth Edition
            </div>
            {settings.tagline && <p>{settings.tagline}</p>}
            {settings.youtube_url && (
              <div style={{ marginTop: 18 }}>
                <a className="btn" href={settings.youtube_url} target="_blank" rel="noreferrer">▶ Watch the series</a>
              </div>
            )}
          </div>
          <Logo size={120} className="hero-logo" />
        </div>
      </section>

      <section className="section grid grid-kpi">
        <Kpi value={model.seasons.length} label="Seasons" />
        <Kpi value={rec.P} label="Matches" />
        <Kpi value={`${rec.winPct}%`} label={`Win rate · ${rec.W}W ${rec.D}D ${rec.L}L`} />
        <Kpi value={rec.GF} label={`Goals scored · ${rec.gpg} per game`} />
        <Kpi value={rec.CS} label="Clean sheets" />
        <Kpi value={used.length} label="Academy players used" />
        <Kpi value={data.trophies.length} label="Trophies" gold />
      </section>

      <section className="section grid grid-2">
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Form</h3>
          {last5.length === 0 ? (
            <p className="muted">No matches yet.</p>
          ) : (
            <>
              <div className="form-strip">
                {last5.map((m) => (
                  <Link key={m.id} href={`/matches/${m.id}`} title={`${m.goals_for}–${m.goals_against} vs ${m.opponent}`}>
                    <span className={`result lg ${m.result}`}>{m.result}</span>
                  </Link>
                ))}
              </div>
              <p className="muted" style={{ margin: '12px 0 0' }}>
                Last {last5.length}, oldest → newest.
                {run.current && run.current.count > 1 && (
                  <> Currently on a <b style={{ color: 'var(--text)' }}>{run.current.count}-match {RUN[run.current.type]} run</b>.</>
                )}
              </p>
            </>
          )}
        </div>

        {latest ? (
          <div className="card">
            <div className="row" style={{ marginBottom: 12 }}>
              <h3>Latest · {seasonLabel(latest)}</h3>
              <span className="spacer" />
              <Link className="link" href={`/seasons/${latest.id}`}>Full season →</Link>
            </div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12 }}>
              <Mini value={latestTable?.club ? ordinal(latestTable.club.pos) : '—'} label={latest.tournament} />
              <Mini value={latestTable?.club ? latestTable.club.points : '—'} label="Points" />
              <Mini value={`${latestRec.W}-${latestRec.D}-${latestRec.L}`} label="W-D-L" />
              <Mini value={latestTop ? latestTop.goals : '—'} label={latestTop ? `Top scorer: ${latestTop.name}` : 'Top scorer'} />
              <Mini value={latestBest ? latestBest.avg_rating : '—'} label={latestBest ? `Best rated: ${latestBest.name}` : 'Best rated'} />
            </div>
          </div>
        ) : (
          <div className="card"><p className="muted">No seasons yet.</p></div>
        )}
      </section>

      <section className="section">
        <h2>Record book</h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <MatchRecord label="Biggest win" m={book.biggestWin} />
          <MatchRecord label="Heaviest defeat" m={book.worstLoss} />
          <MatchRecord label="Highest-scoring game" m={book.mostGoals} />
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
        </div>
      </section>

      <section className="section grid grid-2">
        <div className="card">
          <div className="row" style={{ marginBottom: 8 }}>
            <h3>Latest transfers &amp; loans</h3>
            <span className="spacer" />
            <Link className="link" href="/transfers">All →</Link>
          </div>
          {recentMoves.length === 0 && <p className="muted">No one has left the academy yet.</p>}
          {recentMoves.map((mv) => (
            <div className="leader" key={mv.id}>
              <span className="name">
                <Link href={`/players/${mv.player_id}`}>{mv.player.name}</Link>
                <span className="muted" style={{ display: 'block', fontSize: 12, fontWeight: 400 }}>
                  {MOVE_LABEL[mv.type]}{mv.club ? ` · ${mv.club}` : ''}{mv.season ? ` · ${seasonLabel(mv.season)}` : ''}
                </span>
              </span>
              {mv.fee != null && <span className="val" style={{ fontSize: 20 }}>{formatMoney(mv.fee, model.currency)}</span>}
            </div>
          ))}
        </div>
        <div className="card record-card">
          <div className="label">Record sale</div>
          {recordSale ? (
            <>
              <div className="big" style={{ color: 'var(--gold)' }}>{formatMoney(recordSale.fee, model.currency)}</div>
              <div className="sub">
                <Link href={`/players/${recordSale.player_id}`}>{recordSale.player.name}</Link> → {recordSale.club || '—'}
                {recordSale.season ? ` · ${seasonLabel(recordSale.season)}` : ''}
              </div>
            </>
          ) : (
            <>
              <div className="big">—</div>
              <div className="sub">Nobody sold yet.</div>
            </>
          )}
        </div>
      </section>

      <section className="section">
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Trophy cabinet</h3>
          {data.trophies.length === 0 && <p className="muted">No silverware yet… give the kids time.</p>}
          {[...model.seasons].reverse().flatMap((s) =>
            data.trophies
              .filter((t) => t.season_id === s.id)
              .map((t) => (
                <div className="leader" key={t.id}>
                  <span className="rank">🏆</span>
                  <span className="name">{t.name}</span>
                  <Link className="badge gold" href={`/seasons/${s.id}`}>{seasonLabel(s)}</Link>
                </div>
              ))
          )}
        </div>
      </section>
    </>
  );
}

function Kpi({ value, label, gold }) {
  return (
    <div className="card kpi">
      <div className="value" style={{ color: gold ? 'var(--gold)' : undefined }}>{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}

function Mini({ value, label }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Record({ label, big, sub }) {
  return (
    <div className="card record-card">
      <div className="label">{label}</div>
      <div className="big">{big}</div>
      <div className="sub">{sub}</div>
    </div>
  );
}

function MatchRecord({ label, m }) {
  if (!m) return <Record label={label} big="—" sub="Not yet" />;
  return (
    <div className="card record-card">
      <div className="label">{label}</div>
      <div className="big">{m.goals_for}–{m.goals_against}</div>
      <div className="sub">
        vs <Link href={`/matches/${m.id}`}>{m.opponent}</Link> · {seasonLabel(m.season)}
      </div>
    </div>
  );
}

function PlayerRecord({ label, r, fmt = (v) => v }) {
  if (!r) return <Record label={label} big="—" sub="Not yet" />;
  return (
    <div className="card record-card">
      <div className="label">{label}</div>
      <div className="big">{fmt(r.value)}</div>
      <div className="sub">
        <Link href={`/players/${r.player.id}`}>{r.player.name}</Link> vs <Link href={`/matches/${r.match.id}`}>{r.match.opponent}</Link>
      </div>
    </div>
  );
}
