import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PageHead, StatusBadge, Badge, LinkBtn } from '@/components/ui';
import { TOWNSHIP_STATUS, activeRequirements, parseExtraRequirements } from '@/lib/domain';
import { DocumentsPanel } from '@/components/DocumentsPanel';
import { TownshipForm } from '../TownshipForm';
import { FieldMapper } from './FieldMapper';
import { PreviewControl } from './PreviewControl';
import { uploadTownshipPdf, removeTownshipPdf, deleteTownship } from '../actions';

export const dynamic = 'force-dynamic';

export default async function TownshipDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t, areas, employeesRaw] = await Promise.all([
    prisma.township.findUnique({ where: { id }, include: { areaGroup: true, documents: { orderBy: { createdAt: 'desc' } } } }),
    prisma.areaGroup.findMany({ orderBy: { name: 'asc' } }),
    prisma.employee.findMany({ where: { active: true }, orderBy: { lastName: 'asc' }, select: { id: true, firstName: true, lastName: true, areaGroupId: true } }),
  ]);
  if (!t) notFound();

  // Prefer previewing with employees from this township's area, else any active employee.
  const areaEmps = employeesRaw.filter((e) => e.areaGroupId === t.areaGroupId);
  const previewEmployees = (areaEmps.length ? areaEmps : employeesRaw).map((e) => ({ id: e.id, name: `${e.firstName} ${e.lastName}` }));

  const reqs = activeRequirements(t);
  const extras = parseExtraRequirements(t.extraRequirements);
  const fields: string[] = JSON.parse(t.permitPdfFields || '[]');
  const mappings: Record<string, string> = JSON.parse(t.fieldMappings || '{}');

  return (
    <>
      <PageHead
        title={t.name}
        subtitle={[t.county && `${t.county} County`, t.state].filter(Boolean).join(', ') || undefined}
        action={
          <>
            <TownshipForm areas={areas} township={t} triggerLabel="Edit" triggerClass="btn" />
            <LinkBtn href={t.areaGroupId ? `/generate?area=${t.areaGroupId}&township=${t.id}` : '/generate'} variant="primary">✦ Generate</LinkBtn>
          </>
        }
      />
      <div className="between" style={{ marginBottom: 16 }}>
        <Link className="link" href="/townships">← All townships</Link>
        <div className="row" style={{ gap: 10 }}>
          <StatusBadge map={TOWNSHIP_STATUS} value={t.status} />
          {t.areaGroup && <span className="pill">{t.areaGroup.name}</span>}
        </div>
      </div>

      <div className="grid grid-2">
        <div className="stack" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-head"><h3>Requirements</h3></div>
            <div className="card-pad">
              {reqs.length === 0 && extras.length === 0 ? (
                <div className="muted">No requirements recorded yet.</div>
              ) : (
                <div className="chips">
                  {reqs.map((r) => <span key={r.key} className="tag-req">{r.label}</span>)}
                  {extras.map((x, i) => <span key={i} className="tag-req" style={{ background: 'var(--amber-soft)', color: 'var(--amber)', borderColor: '#fde68a' }}>{x}</span>)}
                </div>
              )}
              {t.requirementsNotes && <p className="muted" style={{ marginTop: 12 }}>{t.requirementsNotes}</p>}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3>Clerk / office</h3></div>
            <div className="card-pad">
              <div className="kvs">
                <div className="k">Office</div><div>{t.clerkOfficeName ?? '—'}</div>
                <div className="k">Clerk</div><div>{t.clerkName ?? '—'}</div>
                <div className="k">Email</div><div>{t.clerkEmail ? <a className="link" href={`mailto:${t.clerkEmail}`}>{t.clerkEmail}</a> : '—'}</div>
                <div className="k">Phone</div><div>{t.clerkPhone ?? '—'}</div>
                <div className="k">Address</div><div>{[t.officeAddress, [t.officeCity, t.state, t.officeZip].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '—'}</div>
                <div className="k">Website</div><div>{t.website ? <a className="link" href={t.website.startsWith('http') ? t.website : `https://${t.website}`} target="_blank">{t.website}</a> : '—'}</div>
              </div>
              {t.clerkEmail && <div style={{ marginTop: 14 }}><LinkBtn href={`/emails?township=${t.id}`} variant="sm">✉ Draft email to clerk</LinkBtn></div>}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3>Logistics</h3></div>
            <div className="card-pad">
              <div className="kvs">
                <div className="k">Permit fee</div><div>{t.permitFee != null ? `$${t.permitFee.toFixed(2)}` : '—'}</div>
                <div className="k">Processing time</div><div>{t.processingDays ? `${t.processingDays} days` : '—'}</div>
                <div className="k">Valid for</div><div>{t.permitDurationDays ? `${t.permitDurationDays} days` : '—'}</div>
                <div className="k">Renewal</div><div>{t.renewalNotes ?? '—'}</div>
              </div>
              {t.notes && <p className="muted" style={{ marginTop: 12 }}>{t.notes}</p>}
            </div>
          </div>
        </div>

        <div className="card" style={{ alignSelf: 'flex-start' }}>
          <div className="card-head">
            <div><h3>Official permit PDF</h3><div className="sub">Upload the township’s form, then map its fields to auto-fill it.</div></div>
            {t.permitPdfPath && <Badge tone="green">Uploaded</Badge>}
          </div>
          <div className="card-pad">
            {!t.permitPdfPath ? (
              <>
                <div className="notice info" style={{ marginBottom: 14 }}>
                  <span>ℹ</span>
                  <div>No form uploaded. Employees will get a generated cover packet until you upload this township’s official fillable PDF.</div>
                </div>
                <form action={uploadTownshipPdf}>
                  <input type="hidden" name="townshipId" value={t.id} />
                  <div className="field"><label>Permit form (PDF)</label><input className="input" type="file" name="pdf" accept="application/pdf" required /></div>
                  <button className="btn primary" type="submit">Upload & detect fields</button>
                </form>
                <hr className="sep" />
                <div className="between">
                  <span className="muted">See the generated packet for this township:</span>
                  <PreviewControl townshipId={t.id} employees={previewEmployees} />
                </div>
              </>
            ) : (
              <>
                <div className="between" style={{ marginBottom: 16 }}>
                  <a className="btn sm" href={`/files/${t.permitPdfPath}`} target="_blank">↗ View blank PDF</a>
                  <form action={removeTownshipPdf}>
                    <input type="hidden" name="townshipId" value={t.id} />
                    <button className="btn ghost sm" type="submit">Remove & re-upload</button>
                  </form>
                </div>
                <div className="notice info" style={{ marginBottom: 16 }}>
                  <span>ℹ</span>
                  <div>Map the fields below, then <b>preview the filled form</b> with a real employee to confirm everything lands in the right place before generating a batch.</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <PreviewControl townshipId={t.id} employees={previewEmployees} />
                </div>
                <FieldMapper townshipId={t.id} fields={fields} mappings={mappings} />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head"><div><h3>Documents</h3><div className="sub">Blank forms, instructions, sample permits, or anything else for this township.</div></div></div>
        <div className="card-pad">
          <DocumentsPanel
            townshipId={t.id}
            docs={t.documents.map((d) => ({ id: d.id, name: d.name, category: d.category, storageKey: d.storageKey, mimeType: d.mimeType, size: d.size, createdAt: d.createdAt.toISOString() }))}
          />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-pad between">
          <div className="muted">Deleting a township removes it and its generated applications.</div>
          <form action={deleteTownship}>
            <input type="hidden" name="id" value={t.id} />
            <button className="btn danger sm" type="submit">Delete township</button>
          </form>
        </div>
      </div>
    </>
  );
}
