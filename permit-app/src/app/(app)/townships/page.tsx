import Link from 'next/link';
import { prisma } from '@/lib/db';
import { PageHead, StatusBadge, Empty, Badge } from '@/components/ui';
import { ImportDrawer } from '@/components/ImportDrawer';
import { TOWNSHIP_STATUS, activeRequirements } from '@/lib/domain';
import { researchEnabled } from '@/lib/research';
import { TownshipForm } from './TownshipForm';
import { ResearchBar } from './ResearchBar';
import { importTownshipsCsv } from './actions';

export const dynamic = 'force-dynamic';

const TWP_TEMPLATE = `Name,County,State,Area,Clerk Name,Clerk Email,Clerk Phone,Fee,Duration,Fingerprints,Background Check,Photo,Insurance,Bond,Notarized
Plainfield Township,Kent,MI,Area 3,Pat Rivers,clerk@plainfield.example,(616) 555-0199,45,180,yes,yes,yes,no,no,yes
Wyoming,Kent,MI,Area 2,Sam Cole,clerk@wyoming.example,(616) 555-0200,30,365,no,yes,no,no,no,no`;

export default async function TownshipsPage({ searchParams }: { searchParams: Promise<{ imported?: string; skipped?: string; research?: string; msg?: string }> }) {
  const { imported, skipped, research, msg } = await searchParams;
  const [townships, areas] = await Promise.all([
    prisma.township.findMany({ include: { areaGroup: true }, orderBy: [{ name: 'asc' }] }),
    prisma.areaGroup.findMany({ orderBy: { name: 'asc' } }),
  ]);
  const aiEnabled = researchEnabled();

  return (
    <>
      <PageHead
        title="Townships"
        subtitle="Every township is different. Track each one's requirements, clerk contact, and official permit PDF so applications fill themselves."
        action={
          <>
            <a className="btn" href="/townships/export">⬇ Export</a>
            <ImportDrawer
              action={importTownshipsCsv}
              title="Import townships"
              description="Bulk-add townships and their requirements from a spreadsheet."
              template={TWP_TEMPLATE}
              templateName="townships-template.csv"
            />
            <TownshipForm areas={areas} />
          </>
        }
      />

      {research === 'nokey' && (
        <div className="notice warn" style={{ marginBottom: 16 }}><span>⚠</span><div>AI research is off — set an <code>ANTHROPIC_API_KEY</code> to enable it.</div></div>
      )}
      {research === 'error' && (
        <div className="notice warn" style={{ marginBottom: 16 }}><span>⚠</span><div>{msg || 'Research failed.'} You can still add this township manually.</div></div>
      )}

      <ResearchBar areas={areas} enabled={aiEnabled} />

      {imported != null && (
        <div className="notice success" style={{ marginBottom: 16 }}>
          <span>✓</span>
          <div>Imported {imported} township{imported === '1' ? '' : 's'}{Number(skipped) > 0 ? ` · skipped ${skipped} row${skipped === '1' ? '' : 's'} (missing name)` : ''}.</div>
        </div>
      )}

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
