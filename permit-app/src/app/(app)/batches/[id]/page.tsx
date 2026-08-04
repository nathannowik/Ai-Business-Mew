import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PageHead, StatusBadge, Badge, Empty } from '@/components/ui';
import { APPLICATION_STATUS } from '@/lib/domain';
import { PrintButton } from '../PrintButton';

export const dynamic = 'force-dynamic';

function parseMissing(json: string | null): string[] {
  if (!json) return [];
  try { const v = JSON.parse(json); return Array.isArray(v) ? v : []; } catch { return []; }
}

export default async function BatchDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const batch = await prisma.permitBatch.findUnique({
    where: { id },
    include: {
      areaGroup: true,
      applications: { include: { township: true, employee: true }, orderBy: [{ townshipId: 'asc' }] },
    },
  });
  if (!batch) notFound();

  const flagged = batch.applications.filter((a) => parseMissing(a.missingRequirements).length > 0);

  return (
    <>
      <PageHead
        title="Print batch"
        subtitle={batch.label}
        action={
          <>
            {batch.combinedPdfPath && <a className="btn" href={`/files/${batch.combinedPdfPath}`} target="_blank">↗ Open PDF</a>}
            {batch.combinedPdfPath && <PrintButton url={`/files/${batch.combinedPdfPath}`} />}
          </>
        }
      />
      <div className="between" style={{ marginBottom: 16 }}>
        <Link className="link" href="/batches">← All batches</Link>
        <div className="row" style={{ gap: 10 }}>
          {batch.areaGroup && <span className="pill">{batch.areaGroup.name}</span>}
          <span className="pill">{batch.applicationCount} permits</span>
          <span className="pill">{batch.createdAt.toLocaleString()}</span>
        </div>
      </div>

      <div className="notice success" style={{ marginBottom: 16 }}>
        <span>✓</span>
        <div>This batch combines all {batch.applicationCount} filled permit forms into one PDF. Click <b>Print batch</b> to send it to your printer, then turn in the stack.</div>
      </div>

      {flagged.length > 0 && (
        <div className="notice warn" style={{ marginBottom: 16 }}>
          <span>⚠</span>
          <div>{flagged.length} permit{flagged.length === 1 ? '' : 's'} in this batch {flagged.length === 1 ? 'has' : 'have'} outstanding requirements (photo, background check, or fingerprints) that must be completed before filing.</div>
        </div>
      )}

      <div className="card">
        <div className="card-head"><h3>Permits in this batch</h3><div className="sub">{batch.applications.length}</div></div>
        {batch.applications.length === 0 ? (
          <Empty title="No applications" />
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Township</th><th>Employee</th><th>Missing items</th><th>Form</th><th>Status</th></tr></thead>
              <tbody>
                {batch.applications.map((a) => {
                  const missing = parseMissing(a.missingRequirements);
                  return (
                    <tr key={a.id}>
                      <td className="cell-strong">{a.township.name}</td>
                      <td>{a.employee.firstName} {a.employee.lastName}</td>
                      <td>{missing.length === 0 ? <Badge tone="green">None</Badge> : <div className="chips">{missing.map((m) => <Badge key={m} tone="red">{m}</Badge>)}</div>}</td>
                      <td>{a.generatedPdfPath ? <a className="link" href={`/files/${a.generatedPdfPath}`} target="_blank">↗ PDF</a> : '—'}</td>
                      <td><StatusBadge map={APPLICATION_STATUS} value={a.status} /></td>
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
