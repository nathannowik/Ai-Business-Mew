import Link from 'next/link';
import { prisma } from '@/lib/db';
import { PageHead, StatusBadge, Empty, Badge } from '@/components/ui';
import { TOWNSHIP_STATUS, activeRequirements } from '@/lib/domain';
import { TownshipForm } from './TownshipForm';

export const dynamic = 'force-dynamic';

export default async function TownshipsPage() {
  const [townships, areas] = await Promise.all([
    prisma.township.findMany({ include: { areaGroup: true }, orderBy: [{ name: 'asc' }] }),
    prisma.areaGroup.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <>
      <PageHead
        title="Townships"
        subtitle="Every township is different. Track each one's requirements, clerk contact, and official permit PDF so applications fill themselves."
        action={<TownshipForm areas={areas} />}
      />

      <div className="card">
        {townships.length === 0 ? (
          <Empty icon="⌂" title="No townships yet" hint="Add a township to record its requirements and upload its permit form." />
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Township</th><th>Area</th><th>Requirements</th><th>Permit PDF</th><th>Fee</th><th>Status</th></tr>
              </thead>
              <tbody>
                {townships.map((t) => {
                  const reqs = activeRequirements(t);
                  return (
                    <tr key={t.id}>
                      <td>
                        <Link className="rowlink" href={`/townships/${t.id}`}>{t.name}</Link>
                        <div className="cell-sub">{[t.county && `${t.county} County`, t.state].filter(Boolean).join(', ') || '—'}</div>
                      </td>
                      <td>{t.areaGroup ? <span className="pill">{t.areaGroup.name}</span> : <span className="faint">—</span>}</td>
                      <td>
                        <div className="chips">
                          {reqs.slice(0, 4).map((r) => <span key={r.key} className="tag-req">{r.short}</span>)}
                          {reqs.length > 4 && <span className="pill">+{reqs.length - 4}</span>}
                          {reqs.length === 0 && <span className="faint">None recorded</span>}
                        </div>
                      </td>
                      <td>{t.permitPdfPath ? <Badge tone="green">Uploaded</Badge> : <Badge tone="amber">Missing</Badge>}</td>
                      <td>{t.permitFee != null ? `$${t.permitFee.toFixed(2)}` : '—'}</td>
                      <td><StatusBadge map={TOWNSHIP_STATUS} value={t.status} /></td>
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
