// Builds the "all stats" Excel workbook (used by the public download and the admin Backup tab).
import {
  buildModel, playerStats, leagueTable, fixture, matchResult, seasonLabel, statusText, formatMoney, moveFee, MOVE_LABEL,
  teamRecord, allHonours, seasonPlayoff, loanLengthLabel, momentLabel, overallSummary,
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
      ['Apps', 'apps', 7], ['Goals', 'goals', 7], ['Assists', 'assists', 8], ['POTM', 'potm', 7], ['Clean sheets', 'cs', 12], ['Avg rating', 'avg', 10],
      ['Starts', 'starts', 7], ['Sub apps', 'subApps', 9], ['Goals as sub', 'subGoals', 12], ['Overall', 'ovr', 8], ['Overall growth', 'growth', 13], ['Found scouting', 'scouted', 18]],
    playerStats(model).map((p) => ({
      kit: p.kit_number ?? '', name: p.name, kitBy: p.kit_chosen_by ? `${p.kit_chosen_by}${p.kit_chosen_episode ? ` (ep. ${p.kit_chosen_episode})` : ''}` : '', position: p.position, country: p.country,
      joined: p.joined ? seasonLabel(p.joined.season) : '', status: statusText(model.statusById[p.id]),
      apps: p.apps, goals: p.goals, assists: p.assists, potm: p.potm, cs: p.cs ?? '', avg: p.avg_rating ?? '',
      starts: p.starts || '', subApps: p.subApps || '', subGoals: p.subGoals || '',
      ...(() => {
        const o = overallSummary(model, p.id);
        return { ovr: o ? o.latest.ovr : '', growth: o && o.history.length > 1 ? o.growth : '' };
      })(),
      scouted: model.scoutingById[p.scouting_id] ? `${model.scoutingById[p.scouting_id].country} (S${model.scoutingById[p.scouting_id].season.number})` : '',
    }))
  );

  sheet(
    'Matches',
    [['Season', 'season', 10], ['Episode', 'episode', 9], ['Tournament', 'tournament', 18], ['Home', 'home', 22], ['Score', 'score', 8], ['Away', 'away', 22],
      ['Penalties', 'pens', 10], ['Result', 'result', 8], ['Date', 'date', 12], ['Scorers', 'scorers', 40], ['POTM', 'potm', 22]],
    model.matches.map((m) => {
      const f = fixture(m, club);
      const potm = m.lineup.find((r) => r.potm);
      return {
        season: seasonLabel(m.season), episode: m.episode ?? '', tournament: m.tournament, home: f.home.name, score: `${f.home.goals}-${f.away.goals}`,
        away: f.away.name, pens: f.pens ? `${f.home.pens}-${f.away.pens}` : '', result: matchResult(m), date: m.played_on || '',
        scorers: m.lineup.filter((r) => r.goals > 0).map((r) => `${model.playerById[r.player_id]?.name}${r.goals > 1 ? ` x${r.goals}` : ''}`).join(', '),
        potm: potm ? model.playerById[potm.player_id]?.name : '',
      };
    })
  );

  sheet(
    'Line-ups',
    [['Season', 'season', 10], ['Match', 'match', 40], ['Player', 'player', 24], ['Rating', 'rating', 8], ['Goals', 'goals', 7], ['Assists', 'assists', 8], ['POTM', 'potm', 7],
      ['Started', 'started', 8], ['Came on for', 'subFor', 22], ['Minute on', 'minuteOn', 10]],
    model.matches.flatMap((m) => {
      const f = fixture(m, club);
      const label = `${f.home.name} ${f.home.goals}-${f.away.goals} ${f.away.name}`;
      return m.lineup.map((r) => ({
        season: seasonLabel(m.season), match: label, player: model.playerById[r.player_id]?.name,
        rating: r.rating == null ? '' : Number(r.rating), goals: r.goals, assists: r.assists, potm: r.potm ? 'yes' : '',
        started: r.started === true ? 'yes' : r.started === false ? 'sub' : '',
        subFor: r.sub_for ? model.playerById[r.sub_for]?.name || '' : '', minuteOn: r.minute_on ?? '',
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
    [['Season', 'season', 10], ['Date', 'date', 12], ['Player', 'player', 24], ['What', 'what', 16], ['Club', 'club', 22], ['Fee', 'fee', 12], ['Loan length', 'loan', 12], ['Notes', 'notes', 30]],
    model.moves.map((mv) => ({
      season: mv.season ? seasonLabel(mv.season) : '', date: mv.moved_on || '', player: mv.player.name, what: MOVE_LABEL[mv.type],
      club: mv.club || '', fee: moveFee(mv) != null ? formatMoney(moveFee(mv), model.currency) : '', loan: mv.type === 'loan' ? loanLengthLabel(mv.loan_length) : '', notes: mv.notes || '',
    }))
  );

  sheet(
    'Seasons',
    [['Season', 'season', 10], ['League', 'league', 18], ['Play-offs & cups', 'cups', 60], ['Notes', 'notes', 40]],
    model.seasons.map((s) => ({
      season: seasonLabel(s), league: s.tournament,
      cups: [
        ...(seasonPlayoff(s) ? [`${seasonPlayoff(s).name} (${seasonPlayoff(s).label})`] : []),
        ...(s.cups || []).map((c) => `${c}${s.cup_results?.[c] ? ` (${s.cup_results[c]})` : ''}`),
      ].join(', '),
      notes: s.notes || '',
    }))
  );

  if (model.scouting.length)
    sheet(
      'Scouting',
      [['Season', 'season', 10], ['Episode', 'episode', 9], ['Country', 'country', 18], ['Suggested by', 'by', 20], ['Players found', 'found', 40], ['Notes', 'notes', 30]],
      model.scouting.map((sc) => ({
        season: seasonLabel(sc.season), episode: sc.episode ?? '', country: sc.country, by: sc.suggested_by || '',
        found: data.players.filter((p) => p.scouting_id === sc.id).map((p) => p.name).join(', '), notes: sc.notes || '',
      }))
    );

  const ovrRows = data.players.flatMap((p) =>
    (model.overallsByPlayer[p.id] || []).map((o) => ({
      player: p.name, season: o.season ? seasonLabel(o.season) : '', when: momentLabel(o.moment), episode: o.episode ?? '', ovr: o.ovr,
    }))
  );
  if (ovrRows.length)
    sheet('Overall ratings', [['Player', 'player', 24], ['Season', 'season', 10], ['When', 'when', 18], ['Episode', 'episode', 9], ['Overall', 'ovr', 8]], ovrRows);

  return wb;
}
