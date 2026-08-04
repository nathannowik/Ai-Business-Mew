import Link from 'next/link';
import { prisma } from '@/lib/db';
import { PageHead, StatusBadge, Badge, Empty } from '@/components/ui';
import { APPLICATION_STATUS, effectiveStatus, expiryInfo } from '@/lib/domain';
import { StatusControl } from './StatusControl';

export const dynamic = 'force-dynamic';

function parseMissing(json: string | null): string[] {
  if (!json) return [];
  try { const v = JSON.parse(json); return Array.isArray(v) ? v : []; } catch { return []; }
}
const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null);

const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'generated', label: 'Filled out' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'approved', label: 'Approved' },
  { key: 'expiring', label: 'Expiring soon' },
  { key: 'expired', label: 'Expired' },
  { key: 'denied', label: 'Denied' },
];

export default async function PermitsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: filter = 'all' } = await searchParams;
  const all = await prisma.permitApplication.findMany({
    include: { township: true, employee: true },
    orderBy: { createdAt: 'desc' },
  });

  const enriched = all.map((a) => ({ a, eff: effectiveStatus(a), exp: expiryInfo(a) }));
  const counts: Record<string, number> = {
    all: enriched.length,
    generated: enriched.filter((x) => x.eff === 'generated').length,
    submitted: enriched.filter((x) => x.eff === 'submitted').length,
    approved: enriched.filter((x) => x.eff === 'approved').length,
    expiring: enriched.filter((x) => x.exp.expiringSoon && x.eff !== 'expired').length,
    expired: enriched.filter((x) => x.eff === 'expired').length,
    denied: enriched.filter((x) => x.eff === 'denied').length,
  };
  const rows = enriched.filter((x) => {
    if (filter === 'all') return true;
    if (filter === 'expiring') return x.exp.expiringSoon && x.eff !== 'expired';
    return x.eff === filter;
  });

  return (
    <>
      <PageHead
        title="Permits"
        subtitle="Every permit and exactly where it stands — filled out, submitted, approved, and how long it’s valid."
        action={<Link className="btn primary" href="/generate">✦ Generate Permits</Link>}
      />

      <div className="wrap-gap" style={{ marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <Link key={f.key} href={f.key === 'all' ? '/permits' : `/permits?status=${f.key}`} className={`btn sm ${filter === f.key ? 'primary' : ''}`}>
            {f.label} <span className="pill" style={{ padding: '0 6px', marginLeft: 4 }}>{counts[f.key] ?? 0}</span>
          </Link>
        ))}
      </div>

      <div className="card">
        {rows.length === 0 ? (
          <Empty
            icon="▤"
            title={filter === 'all' ? 'No permits generated yet' : 'Nothing in this view'}
            hint={filter === 'all' ? 'Head to Generate Permits to create your first print batch.' : 'Try a different filter.'}
            action={filter === 'all' ? <Link className="btn primary" href="/generate">✦ Generate Permits</Link> : undefined}
          />
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Employee</th><th>Township</th><th>Permit #</th><th>Missing</th><th>Validity</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {rows.map(({ a, eff, exp }) => {
                  const missing = parseMissing(a.missingRequirements);
                  return (
                    <tr key={a.id}>
                      <td><Link className="rowlink" href={`/permits/${a.id}`}>{a.employee.firstName} {a.employee.lastName}</Link></td>
                      <td><Link className="link" href={`/townships/${a.townshipId}`}>{a.township.name}</Link></td>
                      <td>{a.permitNumber ?? <span className="faint">—</span>}</td>
                      <td>{missing.length === 0 ? <Badge tone="green">None</Badge> : <div className="chips">{missing.slice(0, 3).map((m) => <Badge key={m} tone="red">{m}</Badge>)}{missing.length > 3 && <span className="pill">+{missing.length - 3}</span>}</div>}</td>
                      <td>
                        {a.expiresAt ? (
                          <div className="stack">
                            <span className="cell-sub">{fmt(a.expiresAt)}</span>
                            {exp.label && <Badge tone={exp.expired ? 'gray' : exp.expiringSoon ? 'amber' : 'green'}>{exp.label}</Badge>}
                          </div>
                        ) : <span className="faint">—</span>}
                      </td>
                      <td><StatusBadge map={APPLICATION_STATUS} value={eff} /></td>
                      <td className="right">
                        <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                          <StatusControl id={a.id} status={a.status} />
                          <Link className="btn sm" href={`/permits/${a.id}`}>Open</Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
