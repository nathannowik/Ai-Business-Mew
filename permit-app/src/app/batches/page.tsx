import Link from 'next/link';
import { prisma } from '@/lib/db';
import { PageHead, Empty, LinkBtn } from '@/components/ui';
import { PrintButton } from './PrintButton';
import { deleteBatch } from './actions';

export const dynamic = 'force-dynamic';

export default async function BatchesPage() {
  const batches = await prisma.permitBatch.findMany({
    include: { areaGroup: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <>
      <PageHead
        title="Print batches"
        subtitle="Each generation run produces one combined, print-ready PDF. Open it, print, and turn the stack in."
        action={<LinkBtn href="/generate" variant="primary">✦ Generate Permits</LinkBtn>}
      />
      <div className="card">
        {batches.length === 0 ? (
          <Empty icon="⎙" title="No batches yet" hint="Generate permits to create your first print-ready batch." />
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Batch</th><th>Area</th><th>Permits</th><th>Created</th><th></th></tr></thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td><Link className="rowlink" href={`/batches/${b.id}`}>{b.label}</Link></td>
                    <td>{b.areaGroup ? <span className="pill">{b.areaGroup.name}</span> : '—'}</td>
                    <td>{b.applicationCount}</td>
                    <td>{b.createdAt.toLocaleString()}</td>
                    <td className="right">
                      <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                        {b.combinedPdfPath && <PrintButton url={`/files/${b.combinedPdfPath}`} label="⎙ Print" />}
                        <LinkBtn href={`/batches/${b.id}`} variant="sm">Open</LinkBtn>
                        <form action={deleteBatch}><input type="hidden" name="id" value={b.id} /><button className="btn ghost sm" title="Delete">🗑</button></form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
