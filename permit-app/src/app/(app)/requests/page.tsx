import { prisma } from '@/lib/db';
import { PageHead, StatusBadge, Badge, Empty } from '@/components/ui';
import { REQUEST_STATUS } from '@/lib/domain';
import { RequestForm } from './RequestForm';
import { deleteRequest, convertRequest, setRequestStatus } from './actions';

export const dynamic = 'force-dynamic';

const PRIORITY_TONE: Record<string, string> = { high: 'red', normal: 'blue', low: 'gray' };
const FLOW = ['new', 'researching', 'info_needed', 'ready'];

export default async function RequestsPage() {
  const [requests, areas] = await Promise.all([
    prisma.townshipRequest.findMany({ orderBy: [{ status: 'asc' }, { createdAt: 'desc' }] }),
    prisma.areaGroup.findMany({ orderBy: { name: 'asc' } }),
  ]);
  const areaName = (id: string | null) => areas.find((a) => a.id === id)?.name;

  const open = requests.filter((r) => !['added', 'declined'].includes(r.status));
  const closed = requests.filter((r) => ['added', 'declined'].includes(r.status));

  return (
    <>
      <PageHead
        title="Township requests"
        subtitle="A queue for new townships you want to knock. Submit one, track it through research, then convert it into a tracked township."
        action={<RequestForm areas={areas} />}
      />

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        {FLOW.map((s) => (
          <div className="card card-pad" key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <StatusBadge map={REQUEST_STATUS} value={s} />
            <span style={{ fontSize: 20, fontWeight: 700 }}>{requests.filter((r) => r.status === s).length}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head"><h3>Open requests</h3><div className="sub">{open.length}</div></div>
        {open.length === 0 ? (
          <Empty icon="✚" title="No open requests" hint="Submit a township you want to start knocking." />
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Township</th><th>Area</th><th>Priority</th><th>Requested by</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {open.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="cell-strong">{r.townshipName}</span>
                      <div className="cell-sub">{[r.county && `${r.county} County`, r.state].filter(Boolean).join(', ') || '—'}</div>
                      {r.notes && <div className="cell-sub" style={{ marginTop: 4, maxWidth: 320 }}>{r.notes}</div>}
                    </td>
                    <td>{areaName(r.areaGroupId) ? <span className="pill">{areaName(r.areaGroupId)}</span> : <span className="faint">—</span>}</td>
                    <td><Badge tone={PRIORITY_TONE[r.priority] ?? 'gray'}>{r.priority}</Badge></td>
                    <td>{r.requestedBy ?? '—'}</td>
                    <td>
                      <form action={setRequestStatus} className="row" style={{ gap: 6 }}>
                        <input type="hidden" name="id" value={r.id} />
                        <select name="status" defaultValue={r.status} className="select" style={{ padding: '5px 8px', width: 'auto' }}>
                          {Object.entries(REQUEST_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <button className="btn ghost sm" type="submit">↻</button>
                      </form>
                    </td>
                    <td className="right">
                      <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                        <RequestForm areas={areas} request={r} triggerLabel="Edit" triggerClass="btn sm" />
                        {r.status === 'ready' && (
                          <form action={convertRequest}><input type="hidden" name="id" value={r.id} /><button className="btn primary sm" type="submit">→ Add township</button></form>
                        )}
                        <form action={deleteRequest}><input type="hidden" name="id" value={r.id} /><button className="btn ghost sm" title="Delete">🗑</button></form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {closed.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-head"><h3>Closed</h3><div className="sub">{closed.length}</div></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Township</th><th>Area</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {closed.map((r) => (
                  <tr key={r.id}>
                    <td className="cell-strong">{r.townshipName}</td>
                    <td>{areaName(r.areaGroupId) ?? '—'}</td>
                    <td><StatusBadge map={REQUEST_STATUS} value={r.status} /></td>
                    <td className="right"><form action={deleteRequest}><input type="hidden" name="id" value={r.id} /><button className="btn ghost sm" title="Delete">🗑</button></form></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
