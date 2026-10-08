// Builds the "all stats" Excel workbook (used by the public download and the admin Backup tab).
import {
  buildModel, playerStats, leagueTable, fixture, matchResult, seasonLabel, statusText, formatMoney, moveFee, MOVE_LABEL,
  teamRecord, allHonours,
} from './data';

// Readable spreadsheet: one sheet per topic.
export function buildWorkbook(ExcelJS, data) {
  const model = buildModel(data);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Youth Edition stats';

  const sheet = (name, columns, rows) => {
    const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = columns.map(([header, key, width]) => ({ header, key, width: width || 14 }));
    ws.getRow(1).font = { bold: true };
    rows.forEach((r) => ws.addRow(r));
    return ws;
  };
  const club = model.clubName;

  // Summary first
  const rec = teamRecord(model.matches);
  const stats = playerStats(model);
  const top = (key) => [...stats].sort((a, b) => (b[key] || 0) - (a[key] || 0))[0];
  const scorer = top('goals');
  const assister = top('assists');
  const honours = allHonours(model);
  const summary = wb.addWorksheet('Summary');
  summary.columns = [{ width: 28 }, { width: 50 }];
  summary.addRow([`${club} · The Youth Edition`]).font = { bold: true, size: 16 };
  summary.addRow([`SparringDK's ${data.edition && !data.edition.is_current ? data.edition.game : 'FC27'} career mode — stats until ${new Date().toISOString().slice(0, 10)}`]).font = { italic: true };
  summary.addRow([]);
  [
    ['Seasons', model.seasons.length],
    ['Matches', rec.P],
    ['Won / drawn / lost', `${rec.W} / ${rec.D} / ${rec.L}`],
    ['Win rate', `${rec.winPct}%`],
    ['Goals scored / conceded', `${rec.GF} / ${rec.GA}`],
    ['Clean sheets', rec.CS],
    ['Academy players used', stats.filter((p) => p.apps > 0).length],
    ['Top scorer', scorer && scorer.goals ? `${scorer.name} (${scorer.goals})` : '—'],
    ['Most assists', assister && assister.assists ? `${assister.name} (${assister.assists})` : '—'],
    ['Trophies', honours.length ? honours.map((h) => `${h.name} (${seasonLabel(h.season)})`).join(', ') : '—'],
  ].forEach(([k, v]) => {
    const row = summary.addRow([k, v]);
    row.getCell(1).font = { bold: true };
  });

  sheet(
    'Players',
    [['No.', 'kit', 6], ['Name', 'name', 24], ['Kit picked by', 'kitBy', 18], ['Pos', 'position', 7], ['Country', 'country', 14], ['Joined', 'joined', 10], ['Status', 'status', 26],
      ['Apps', 'apps', 7], ['Goals', 'goals', 7], ['Assists', 'assists', 8], ['POTM', 'potm', 7], ['Clean sheets', 'cs', 12], ['Avg rating', 'avg', 10]],
    playerStats(model).map((p) => ({
      kit: p.kit_number ?? '', name: p.name, kitBy: p.kit_chosen_by ? `${p.kit_chosen_by}${p.kit_chosen_episode ? ` (ep. ${p.kit_chosen_episode})` : ''}` : '', position: p.position, country: p.country,
      joined: p.joined ? seasonLabel(p.joined.season) : '', status: statusText(model.statusById[p.id]),
      apps: p.apps, goals: p.goals, assists: p.assists, potm: p.potm, cs: p.cs ?? '', avg: p.avg_rating ?? '',
    }))
  );

  sheet(
    'Matches',
    [['Season', 'season', 10], ['Tournament', 'tournament', 18], ['Home', 'home', 22], ['Score', 'score', 8], ['Away', 'away', 22],
      ['Penalties', 'pens', 10], ['Result', 'result', 8], ['Date', 'date', 12], ['Scorers', 'scorers', 40], ['POTM', 'potm', 22]],
    model.matches.map((m) => {
      const f = fixture(m, club);
      const potm = m.lineup.find((r) => r.potm);
      return {
        season: seasonLabel(m.season), tournament: m.tournament, home: f.home.name, score: `${f.home.goals}-${f.away.goals}`,
        away: f.away.name, pens: f.pens ? `${f.home.pens}-${f.away.pens}` : '', result: matchResult(m), date: m.played_on || '',
        scorers: m.lineup.filter((r) => r.goals > 0).map((r) => `${model.playerById[r.player_id]?.name}${r.goals > 1 ? ` x${r.goals}` : ''}`).join(', '),
        potm: potm ? model.playerById[potm.player_id]?.name : '',
      };
    })
  );

  sheet(
    'Line-ups',
    [['Season', 'season', 10], ['Match', 'match', 40], ['Player', 'player', 24], ['Rating', 'rating', 8], ['Goals', 'goals', 7], ['Assists', 'assists', 8], ['POTM', 'potm', 7]],
    model.matches.flatMap((m) => {
      const f = fixture(m, club);
      const label = `${f.home.name} ${f.home.goals}-${f.away.goals} ${f.away.name}`;
      return m.lineup.map((r) => ({
        season: seasonLabel(m.season), match: label, player: model.playerById[r.player_id]?.name,
        rating: r.rating == null ? '' : Number(r.rating), goals: r.goals, assists: r.assists, potm: r.potm ? 'yes' : '',
      }));
    })
  );

  sheet(
    'League tables',
    [['Season', 'season', 10], ['League', 'league', 18], ['Pos', 'pos', 6], ['Team', 'team', 24], ['P', 'p', 5], ['W', 'w', 5], ['D', 'd', 5],
      ['L', 'l', 5], ['GF', 'gf', 5], ['GA', 'ga', 5], ['GD', 'gd', 5], ['Pts', 'pts', 6]],
    model.seasons.flatMap((s) =>
      leagueTable(model, s.id).rows.map((t) => ({
        season: seasonLabel(s), league: s.tournament, pos: t.pos, team: t.team, p: t.played ?? '', w: t.won ?? '', d: t.drawn ?? '',
        l: t.lost ?? '', gf: t.gf ?? '', ga: t.ga ?? '', gd: t.gd ?? '', pts: t.points,
      }))
    )
  );

  sheet(
    'Transfers',
    [['Season', 'season', 10], ['Date', 'date', 12], ['Player', 'player', 24], ['What', 'what', 16], ['Club', 'club', 22], ['Fee', 'fee', 12], ['Notes', 'notes', 30]],
    model.moves.map((mv) => ({
      season: mv.season ? seasonLabel(mv.season) : '', date: mv.moved_on || '', player: mv.player.name, what: MOVE_LABEL[mv.type],
      club: mv.club || '', fee: moveFee(mv) != null ? formatMoney(moveFee(mv), model.currency) : '', notes: mv.notes || '',
    }))
  );

  sheet(
    'Seasons',
    [['Season', 'season', 10], ['League', 'league', 18], ['Cups', 'cups', 50], ['Notes', 'notes', 40]],
    model.seasons.map((s) => ({
      season: seasonLabel(s), league: s.tournament,
      cups: (s.cups || []).map((c) => `${c}${s.cup_results?.[c] ? ` (${s.cup_results[c]})` : ''}`).join(', '),
      notes: s.notes || '',
    }))
  );

  return wb;
}
