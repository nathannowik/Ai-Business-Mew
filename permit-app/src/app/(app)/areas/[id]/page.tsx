import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PageHead, Badge, Avatar, StatusBadge, LinkBtn, Empty } from '@/components/ui';
import { COMPLIANCE_STATUS, TOWNSHIP_STATUS, activeRequirements } from '@/lib/domain';

export const dynamic = 'force-dynamic';

export default async function AreaDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const area = await prisma.areaGroup.findUnique({
    where: { id },
    include: {
      employees: { orderBy: { lastName: 'asc' } },
      townships: { orderBy: { name: 'asc' } },
    },
  });
  if (!area) notFound();

  return (
    <>
      <PageHead
        title={area.name}
        subtitle={area.description ?? undefined}
        action={<LinkBtn href={`/generate?area=${area.id}`} variant="primary">✦ Generate permits for this area</LinkBtn>}
      />
      <div style={{ marginBottom: 16 }}><Link className="link" href="/areas">← All area groups</Link></div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-head"><div><h3>Employees</h3><div className="sub">{area.employees.length} assigned</div></div><LinkBtn href="/employees" variant="ghost sm">Manage →</LinkBtn></div>
          {area.employees.length === 0 ? (
            <Empty icon="☺" title="No employees in this area" />
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Name</th><th>Photo</th><th>Bg</th><th>Print</th></tr></thead>
                <tbody>
                  {area.employees.map((e) => (
                    <tr key={e.id}>
                      <td><div className="row"><Avatar first={e.firstName} last={e.lastName} /><Link className="rowlink" href={`/employees/${e.id}`}>{e.firstName} {e.lastName}</Link></div></td>
                      <td><Badge tone={(COMPLIANCE_STATUS[e.photoStatus] ?? COMPLIANCE_STATUS.missing).tone}>{(COMPLIANCE_STATUS[e.photoStatus] ?? COMPLIANCE_STATUS.missing).label}</Badge></td>
                      <td><Badge tone={(COMPLIANCE_STATUS[e.backgroundCheckStatus] ?? COMPLIANCE_STATUS.missing).tone}>{(COMPLIANCE_STATUS[e.backgroundCheckStatus] ?? COMPLIANCE_STATUS.missing).label}</Badge></td>
                      <td><Badge tone={(COMPLIANCE_STATUS[e.fingerprintStatus] ?? COMPLIANCE_STATUS.missing).tone}>{(COMPLIANCE_STATUS[e.fingerprintStatus] ?? COMPLIANCE_STATUS.missing).label}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head"><div><h3>Designated townships</h3><div className="sub">{area.townships.length} townships</div></div><LinkBtn href="/townships" variant="ghost sm">Manage →</LinkBtn></div>
          {area.townships.length === 0 ? (
            <Empty icon="⌂" title="No townships designated" hint="Assign townships to this area from the Townships page." />
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Township</th><th>Requirements</th><th>Status</th></tr></thead>
                <tbody>
                  {area.townships.map((t) => (
                    <tr key={t.id}>
                      <td><Link className="rowlink" href={`/townships/${t.id}`}>{t.name}</Link><div className="cell-sub">{[t.county && `${t.county} Co.`, t.state].filter(Boolean).join(', ')}</div></td>
                      <td><span className="pill">{activeRequirements(t).length} items</span></td>
                      <td><StatusBadge map={TOWNSHIP_STATUS} value={t.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
