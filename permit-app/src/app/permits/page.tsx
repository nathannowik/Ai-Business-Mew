import Link from 'next/link';
import { prisma } from '@/lib/db';
import { PageHead, StatusBadge, Badge, Empty } from '@/components/ui';
import { APPLICATION_STATUS } from '@/lib/domain';
import { StatusControl } from './StatusControl';
import { deleteApplication } from './actions';

export const dynamic = 'force-dynamic';

function parseMissing(json: string | null): string[] {
  if (!json) return [];
  try { const v = JSON.parse(json); return Array.isArray(v) ? v : []; } catch { return []; }
}

export default async function PermitsPage() {
  const apps = await prisma.permitApplication.findMany({
    include: { township: true, employee: true, batch: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <>
      <PageHead
        title="Permits"
        subtitle="Every generated permit application and where it stands. Update status as you submit and hear back from clerks."
      />
      <div className="card">
        {apps.length === 0 ? (
          <Empty icon="▤" title="No permits generated yet" hint="Head to Generate Permits to create your first print batch." action={<Link className="btn primary" href="/generate">✦ Generate Permits</Link>} />
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Employee</th><th>Township</th><th>Missing items</th><th>Expires</th><th>Form</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {apps.map((a) => {
                  const missing = parseMissing(a.missingRequirements);
                  return (
                    <tr key={a.id}>
                      <td className="cell-strong">{a.employee.firstName} {a.employee.lastName}</td>
                      <td><Link className="rowlink" href={`/townships/${a.townshipId}`}>{a.township.name}</Link></td>
                      <td>{missing.length === 0 ? <Badge tone="green">None</Badge> : <div className="chips">{missing.map((m) => <Badge key={m} tone="red">{m}</Badge>)}</div>}</td>
                      <td>{a.expiresAt ? a.expiresAt.toLocaleDateString() : '—'}</td>
                      <td>{a.generatedPdfPath ? <a className="link" href={`/files/${a.generatedPdfPath}`} target="_blank">↗ PDF</a> : '—'}</td>
                      <td><StatusBadge map={APPLICATION_STATUS} value={a.status} /></td>
                      <td className="right">
                        <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                          <StatusControl id={a.id} status={a.status} />
                          <form action={deleteApplication}><input type="hidden" name="id" value={a.id} /><button className="btn ghost sm" title="Delete">🗑</button></form>
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
