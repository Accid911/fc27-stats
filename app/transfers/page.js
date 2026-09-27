import Link from 'next/link';
import { loadAll, buildModel, formatMoney, seasonLabel, MOVE_LABEL, STATUS_BADGE, statusText } from '@/lib/data';
import DemoNotice from '@/components/DemoNotice';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Transfers · Leicester City Youth Edition' };

const TYPE_BADGE = { sold: 'gold', loan: 'blue', loan_return: 'green', released: '' };

export default async function TransfersPage() {
  const data = await loadAll();
  const model = buildModel(data);
  const moves = [...model.moves].reverse();
  const sales = model.moves.filter((mv) => mv.type === 'sold');
  const income = sales.reduce((a, mv) => a + Number(mv.fee || 0), 0);
  const loanIncome = model.moves.filter((mv) => mv.type === 'loan').reduce((a, mv) => a + Number(mv.fee || 0), 0);
  const onLoan = data.players.filter((p) => model.statusById[p.id]?.status === 'loan');

  return (
    <>
      <DemoNotice demo={data.demo} />
      <div className="eyebrow">Academy exits</div>
      <h1 style={{ marginBottom: 24 }}>Transfers &amp; loans</h1>

      <section className="grid grid-kpi">
        <Kpi value={sales.length} label="Players sold" />
        <Kpi value={formatMoney(income, model.currency)} label="Transfer income" gold />
        <Kpi value={formatMoney(loanIncome, model.currency)} label="Loan fees" />
        <Kpi value={onLoan.length} label="Out on loan now" />
      </section>

      {onLoan.length > 0 && (
        <section className="section">
          <h2>Out on loan</h2>
          <div className="chips">
            {onLoan.map((p) => (
              <Link key={p.id} href={`/players/${p.id}`} className="chip">
                <span className="chip-pos">{p.position}</span> {p.name} <span className="muted">· {model.statusById[p.id].move?.club}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <h2>History</h2>
        <div className="card pad-0">
          {moves.length === 0 ? (
            <p className="muted" style={{ padding: 20, margin: 0 }}>No transfers or loans yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Season</th><th>Date</th><th>Player</th><th>Pos</th><th>What</th><th>Club</th><th className="num">Fee</th><th>Now</th></tr>
                </thead>
                <tbody>
                  {moves.map((mv) => (
                    <tr key={mv.id}>
                      <td>{mv.season ? <Link href={`/seasons/${mv.season.id}`}>{seasonLabel(mv.season)}</Link> : '—'}</td>
                      <td className="muted">{mv.moved_on || '—'}</td>
                      <td><Link href={`/players/${mv.player_id}`}>{mv.player.name}</Link></td>
                      <td className="muted">{mv.player.position}</td>
                      <td><span className={`badge ${TYPE_BADGE[mv.type]}`}>{MOVE_LABEL[mv.type]}</span></td>
                      <td>{mv.club || '—'}</td>
                      <td className="num" style={{ fontWeight: 700 }}>{mv.fee != null ? formatMoney(mv.fee, model.currency) : '—'}</td>
                      <td className="muted">{statusText(model.statusById[mv.player_id])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
