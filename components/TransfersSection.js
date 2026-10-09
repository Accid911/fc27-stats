import Link from 'next/link';
import { formatMoney, seasonLabel, MOVE_LABEL, statusText, moveFee } from '@/lib/data';
import { Kpi } from '@/components/StatCards';
import TransfersTable from '@/components/TransfersTable';
import { positionOrder } from '@/lib/constants';

const TYPE_BADGE = { sold: 'gold', loan: 'blue', loan_return: 'green', released: '' };

// Transfers & loans overview (shown at the bottom of the Players page).
export default function TransfersSection({ model, data, base = '' }) {
  const moves = [...model.moves].reverse();
  const sales = model.moves.filter((mv) => mv.type === 'sold');
  const income = sales.reduce((a, mv) => a + Number(mv.fee || 0), 0);
  const loans = model.moves.filter((mv) => mv.type === 'loan').length;
  // plain rows for the sortable table (oldest move = order 0)
  const rows = model.moves.map((mv, i) => {
    const fee = moveFee(mv);
    return {
      id: mv.id,
      order: i,
      seasonNo: mv.season?.number ?? null,
      season: mv.season ? seasonLabel(mv.season) : '',
      seasonHref: mv.season ? `${base}/seasons/${mv.season.id}` : null,
      date: mv.moved_on || '',
      player: mv.player.name,
      playerHref: `${base}/players/${mv.player_id}`,
      pos: mv.player.position || '',
      posOrder: mv.player.position ? positionOrder(mv.player.position) : null,
      what: MOVE_LABEL[mv.type],
      badge: TYPE_BADGE[mv.type],
      club: mv.club || '',
      fee: fee != null ? Number(fee) : null,
      feeText: fee != null ? formatMoney(fee, model.currency) : '—',
      now: statusText(model.statusById[mv.player_id]),
    };
  });
  const onLoan = data.players.filter((p) => model.statusById[p.id]?.status === 'loan');

  return (
    <section className="section" id="transfers" style={{ scrollMarginTop: 80 }}>
      <h2>Transfers &amp; loans</h2>
      <div className="grid grid-kpi">
        <Kpi value={sales.length} label="Players sold" />
        <Kpi value={formatMoney(income, model.currency)} label="Transfer income" gold />
        <Kpi value={loans} label="Loan spells" />
        <Kpi value={onLoan.length} label="Out on loan now" />
      </div>

      {onLoan.length > 0 && (
        <div className="section" style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 12 }}>Out on loan</h3>
          <div className="chips">
            {onLoan.map((p) => (
              <Link key={p.id} href={`${base}/players/${p.id}`} className="chip">
                <span className="chip-pos">{p.position}</span> {p.name} <span className="muted">· {model.statusById[p.id].move?.club}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="section" style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 12 }}>History</h3>
        <div className="card pad-0">
          {moves.length === 0 ? (
            <p className="muted" style={{ padding: 20, margin: 0 }}>No transfers or loans yet.</p>
          ) : (
            <TransfersTable rows={rows} />
          )}
        </div>
      </div>
    </section>
  );
}
