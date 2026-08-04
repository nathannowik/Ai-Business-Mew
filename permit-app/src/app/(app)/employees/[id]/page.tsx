import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PageHead, Badge, StatusBadge, Avatar, LinkBtn, Empty } from '@/components/ui';
import { COMPLIANCE_STATUS, APPLICATION_STATUS, effectiveStatus, expiryInfo } from '@/lib/domain';
import { DocumentsPanel } from '@/components/DocumentsPanel';
import { EmployeeForm } from '../EmployeeForm';

export const dynamic = 'force-dynamic';

const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

function Comp({ label, value, date }: { label: string; value: string; date?: Date | null }) {
  const meta = COMPLIANCE_STATUS[value] ?? COMPLIANCE_STATUS.missing;
  return (
    <div className="row between" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
      <div><div className="cell-strong">{label}</div>{date && <div className="cell-sub">{fmt(date)}</div>}</div>
      <Badge tone={meta.tone}>{meta.label}</Badge>
    </div>
  );
}

export default async function EmployeeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [e, areas] = await Promise.all([
    prisma.employee.findUnique({
      where: { id },
      include: {
        areaGroup: true,
        documents: { orderBy: { createdAt: 'desc' } },
        applications: { include: { township: true }, orderBy: { createdAt: 'desc' } },
      },
    }),
    prisma.areaGroup.findMany({ orderBy: { name: 'asc' } }),
  ]);
  if (!e) notFound();

  const active = e.applications.filter((a) => effectiveStatus(a) === 'approved').length;

  return (
    <>
      <PageHead
        title={`${e.firstName} ${e.lastName}`}
        subtitle={e.areaGroup ? `${e.areaGroup.name}${e.active ? '' : ' · inactive'}` : e.active ? undefined : 'Inactive'}
        action={<EmployeeForm areas={areas} employee={e} triggerLabel="Edit employee" triggerClass="btn" />}
      />
      <div className="between" style={{ marginBottom: 16 }}>
        <Link className="link" href="/employees">← All employees</Link>
        <div className="row" style={{ gap: 10 }}>
          <span className="pill">{e.applications.length} permits</span>
          <span className="pill">{active} active</span>
        </div>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'flex-start' }}>
        <div className="stack" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-head"><h3>Contact</h3><Avatar first={e.firstName} last={e.lastName} /></div>
            <div className="card-pad">
              <div className="kvs">
                <div className="k">Email</div><div>{e.email ? <a className="link" href={`mailto:${e.email}`}>{e.email}</a> : '—'}</div>
                <div className="k">Phone</div><div>{e.phone ?? '—'}</div>
                <div className="k">Address</div><div>{[e.address, [e.city, e.state, e.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '—'}</div>
                <div className="k">Date of birth</div><div>{fmt(e.dob)}</div>
                <div className="k">Driver&apos;s license</div><div>{[e.driverLicense, e.driverLicenseState && `(${e.driverLicenseState})`].filter(Boolean).join(' ') || '—'}</div>
                <div className="k">Vehicle</div><div>{[e.vehicleColor, e.vehicleMakeModel, e.vehiclePlate && `— ${e.vehiclePlate}`].filter(Boolean).join(' ') || '—'}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3>Compliance</h3></div>
            <div className="card-pad">
              <div className="stack" style={{ gap: 8 }}>
                <Comp label="2×2 Photo" value={e.photoStatus} />
                <Comp label="Background check" value={e.backgroundCheckStatus} date={e.backgroundCheckDate} />
                <Comp label="Fingerprints" value={e.fingerprintStatus} date={e.fingerprintDate} />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3>Documents</h3><div className="sub">{e.documents.length}</div></div>
            <div className="card-pad">
              <DocumentsPanel
                employeeId={e.id}
                docs={e.documents.map((d) => ({ id: d.id, name: d.name, category: d.category, storageKey: d.storageKey, mimeType: d.mimeType, size: d.size, createdAt: d.createdAt.toISOString() }))}
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ alignSelf: 'flex-start' }}>
          <div className="card-head">
            <div><h3>Permits</h3><div className="sub">This person&apos;s permits across townships</div></div>
            <LinkBtn href={e.areaGroupId ? `/generate?area=${e.areaGroupId}` : '/generate'} variant="primary sm">✦ Generate</LinkBtn>
          </div>
          {e.applications.length === 0 ? (
            <Empty icon="▤" title="No permits yet" hint="Generate permits for this employee’s area to get started." />
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Township</th><th>Validity</th><th>Status</th></tr></thead>
                <tbody>
                  {e.applications.map((a) => {
                    const eff = effectiveStatus(a);
                    const exp = expiryInfo(a);
                    return (
                      <tr key={a.id}>
                        <td>
                          <Link className="rowlink" href={`/permits/${a.id}`}>{a.township.name}</Link>
                          {a.permitNumber && <div className="cell-sub">#{a.permitNumber}</div>}
                        </td>
                        <td>{a.expiresAt ? <span className="stack"><span className="cell-sub">{fmt(a.expiresAt)}</span>{exp.label && <Badge tone={exp.expired ? 'gray' : exp.expiringSoon ? 'amber' : 'green'}>{exp.label}</Badge>}</span> : <span className="faint">—</span>}</td>
                        <td><StatusBadge map={APPLICATION_STATUS} value={eff} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
