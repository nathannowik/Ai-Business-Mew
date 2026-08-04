import Link from 'next/link';
import { prisma } from '@/lib/db';
import { PageHead, StatusBadge, Badge, LinkBtn } from '@/components/ui';
import { APPLICATION_STATUS, REQUEST_STATUS, activeRequirements, missingRequirementsFor } from '@/lib/domain';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const [employees, areas, townships, applications, requests, batches] = await Promise.all([
    prisma.employee.findMany({ include: { areaGroup: true } }),
    prisma.areaGroup.findMany({ include: { _count: { select: { employees: true, townships: true } } } }),
    prisma.township.findMany({ include: { areaGroup: true } }),
    prisma.permitApplication.findMany({ include: { township: true, employee: true } }),
    prisma.townshipRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.permitBatch.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
  ]);

  const activeEmployees = employees.filter((e) => e.active);
  const statusCounts = APP_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = applications.filter((a) => a.status === s).length;
    return acc;
  }, {});

  // Upcoming expirations (approved permits expiring within 45 days)
  const soon = new Date();
  soon.setDate(soon.getDate() + 45);
  const expiring = applications
    .filter((a) => a.expiresAt && a.expiresAt <= soon && a.status !== 'expired')
    .sort((a, b) => (a.expiresAt!.getTime() - b.expiresAt!.getTime()))
    .slice(0, 6);

  // Compliance gaps: employees missing a requirement that a township in their area needs
  const gaps: { employee: string; area: string; township: string; missing: string[] }[] = [];
  for (const emp of activeEmployees) {
    if (!emp.areaGroupId) continue;
    const empTownships = townships.filter((t) => t.areaGroupId === emp.areaGroupId && t.status === 'active');
    for (const t of empTownships) {
      const missing = missingRequirementsFor(t, emp);
      if (missing.length) gaps.push({ employee: `${emp.firstName} ${emp.lastName}`, area: emp.areaGroup?.name ?? '', township: t.name, missing });
    }
  }

  return (
    <>
      <PageHead
        title="Dashboard"
        subtitle="Everything you need to keep field teams permitted — at a glance."
        action={<LinkBtn href="/generate" variant="primary">✦ Generate Permits</LinkBtn>}
      />

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <Stat k="Active employees" v={activeEmployees.length} sub={`${areas.length} area groups`} icon="☺" />
        <Stat k="Townships tracked" v={townships.length} sub={`${townships.filter((t) => t.status === 'active').length} active`} icon="⌂" />
        <Stat k="Permits generated" v={applications.length} sub={`${statusCounts.approved ?? 0} approved`} icon="▤" />
        <Stat k="Print batches" v={batches.length} sub="ready to file" icon="⎙" />
      </div>

      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        {APP_STATUSES.map((s) => (
          <div className="card card-pad" key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <StatusBadge map={APPLICATION_STATUS} value={s} />
            <span style={{ fontSize: 20, fontWeight: 700 }}>{statusCounts[s] ?? 0}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Compliance gaps</h3>
              <div className="sub">Employees missing a requirement for a township in their area</div>
            </div>
            <LinkBtn href="/employees" variant="ghost sm">Employees →</LinkBtn>
          </div>
          <div className="table-wrap">
            {gaps.length === 0 ? (
              <div className="empty"><div className="big">✓</div>Everyone is compliant for their assigned townships.</div>
            ) : (
              <table className="tbl">
                <thead><tr><th>Employee</th><th>Township</th><th>Missing</th></tr></thead>
                <tbody>
                  {gaps.slice(0, 8).map((g, i) => (
                    <tr key={i}>
                      <td><span className="cell-strong">{g.employee}</span><div className="cell-sub">{g.area}</div></td>
                      <td>{g.township}</td>
                      <td><div className="chips">{g.missing.map((m) => <Badge key={m} tone="red">{m}</Badge>)}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3>Upcoming expirations</h3>
              <div className="sub">Permits expiring in the next 45 days</div>
            </div>
            <LinkBtn href="/permits" variant="ghost sm">Permits →</LinkBtn>
          </div>
          <div className="table-wrap">
            {expiring.length === 0 ? (
              <div className="empty"><div className="big">🗓</div>No permits expiring soon.</div>
            ) : (
              <table className="tbl">
                <thead><tr><th>Township</th><th>Employee</th><th>Expires</th></tr></thead>
                <tbody>
                  {expiring.map((a) => (
                    <tr key={a.id}>
                      <td className="cell-strong">{a.township.name}</td>
                      <td>{a.employee.firstName} {a.employee.lastName}</td>
                      <td>{a.expiresAt?.toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-head">
            <div><h3>Area groups</h3><div className="sub">Teams and their designated townships</div></div>
            <LinkBtn href="/areas" variant="ghost sm">Manage →</LinkBtn>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Area</th><th className="right">Employees</th><th className="right">Townships</th></tr></thead>
              <tbody>
                {areas.map((a) => (
                  <tr key={a.id}>
                    <td><span className="row"><span style={{ width: 10, height: 10, borderRadius: 3, background: a.color ?? '#2563eb', display: 'inline-block' }} /> <Link className="rowlink" href={`/areas/${a.id}`}>{a.name}</Link></span><div className="cell-sub">{a.description}</div></td>
                    <td className="right">{a._count.employees}</td>
                    <td className="right">{a._count.townships}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div><h3>Recent township requests</h3><div className="sub">New townships to research & add</div></div>
            <LinkBtn href="/requests" variant="ghost sm">All requests →</LinkBtn>
          </div>
          <div className="table-wrap">
            {requests.length === 0 ? (
              <div className="empty"><div className="big">✚</div>No open requests.</div>
            ) : (
              <table className="tbl">
                <thead><tr><th>Township</th><th>Requested by</th><th>Status</th></tr></thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td className="cell-strong">{r.townshipName}<div className="cell-sub">{[r.county && `${r.county} County`, r.state].filter(Boolean).join(', ')}</div></td>
                      <td>{r.requestedBy ?? '—'}</td>
                      <td><StatusBadge map={REQUEST_STATUS} value={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const APP_STATUSES = ['generated', 'submitted', 'approved'];

function Stat({ k, v, sub, icon }: { k: string; v: number | string; sub?: string; icon?: string }) {
  return (
    <div className="stat">
      <div className="k">{icon && <span>{icon}</span>}{k}</div>
      <div className="v">{v}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}
