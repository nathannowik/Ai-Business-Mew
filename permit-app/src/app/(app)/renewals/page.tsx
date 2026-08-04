import Link from 'next/link';
import type { PermitApplication, Township, Employee } from '@prisma/client';
import { prisma } from '@/lib/db';
import { PageHead, Badge } from '@/components/ui';
import { effectiveStatus, expiryInfo, type ExpiryInfo } from '@/lib/domain';
import { regenerateApplication } from '../permits/actions';

type Row = { a: PermitApplication & { township: Township; employee: Employee }; exp: ExpiryInfo };

export const dynamic = 'force-dynamic';

const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const SOON_DAYS = 45;

export default async function RenewalsPage() {
  const apps = await prisma.permitApplication.findMany({
    where: { expiresAt: { not: null } },
    include: { township: true, employee: true },
    orderBy: { expiresAt: 'asc' },
  });

  const enriched = apps.map((a) => ({ a, eff: effectiveStatus(a), exp: expiryInfo(a, SOON_DAYS) }));
  const expired = enriched.filter((x) => x.eff === 'expired');
  const soon = enriched.filter((x) => x.eff !== 'expired' && x.exp.expiringSoon);
  const healthy = enriched.filter((x) => x.eff === 'approved' && !x.exp.expiringSoon && !x.exp.expired);

  return (
    <>
      <PageHead
        title="Renewals"
        subtitle={`Permits that have expired or are within ${SOON_DAYS} days of expiring. Re-generate one to produce a fresh, print-ready form.`}
      />

      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <div className="stat"><div className="k">⌛ Expired</div><div className="v" style={{ color: 'var(--red)' }}>{expired.length}</div><div className="sub">need renewal now</div></div>
        <div className="stat"><div className="k">⏳ Expiring soon</div><div className="v" style={{ color: 'var(--amber)' }}>{soon.length}</div><div className="sub">within {SOON_DAYS} days</div></div>
        <div className="stat"><div className="k">✓ In good standing</div><div className="v" style={{ color: 'var(--green)' }}>{healthy.length}</div><div className="sub">approved & current</div></div>
      </div>

      <RenewSection title="Expired" tone="red" rows={expired} emptyText="Nothing expired. 🎉" />
      <RenewSection title="Expiring soon" tone="amber" rows={soon} emptyText="Nothing expiring in the next 45 days." />

      {healthy.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-head"><h3>In good standing</h3><div className="sub">{healthy.length}</div></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Employee</th><th>Township</th><th>Permit #</th><th>Expires</th></tr></thead>
              <tbody>
                {healthy.map(({ a, exp }) => (
                  <tr key={a.id}>
                    <td><Link className="rowlink" href={`/permits/${a.id}`}>{a.employee.firstName} {a.employee.lastName}</Link></td>
                    <td>{a.township.name}</td>
                    <td>{a.permitNumber ?? '—'}</td>
                    <td>{fmt(a.expiresAt)} <Badge tone="green">{exp.label}</Badge></td>
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

function RenewSection({
  title, tone, rows, emptyText,
}: {
  title: string; tone: string; rows: Row[]; emptyText: string;
}) {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-head"><h3>{title}</h3><Badge tone={tone}>{rows.length}</Badge></div>
      {rows.length === 0 ? (
        <div className="empty" style={{ padding: '28px' }}>{emptyText}</div>
      ) : (
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Employee</th><th>Township</th><th>Permit #</th><th>Expires</th><th></th></tr></thead>
            <tbody>
              {rows.map(({ a, exp }) => (
                <tr key={a.id}>
                  <td><Link className="rowlink" href={`/permits/${a.id}`}>{a.employee.firstName} {a.employee.lastName}</Link></td>
                  <td><Link className="link" href={`/townships/${a.townshipId}`}>{a.township.name}</Link></td>
                  <td>{a.permitNumber ?? '—'}</td>
                  <td>{fmt(a.expiresAt)} <Badge tone={tone}>{exp.label}</Badge></td>
                  <td className="right">
                    <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                      <Link className="btn sm" href={`/permits/${a.id}`}>Open</Link>
                      <form action={regenerateApplication}><input type="hidden" name="id" value={a.id} /><button className="btn primary sm" type="submit">↻ Renew</button></form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
