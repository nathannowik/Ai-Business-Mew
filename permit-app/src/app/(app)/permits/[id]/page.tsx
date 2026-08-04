import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PageHead, StatusBadge, Badge, LinkBtn, Avatar } from '@/components/ui';
import { APPLICATION_STATUS, LIFECYCLE_STAGES, effectiveStatus, expiryInfo } from '@/lib/domain';
import { LifecycleForm } from './LifecycleForm';
import { regenerateApplication, deleteApplication } from '../actions';

export const dynamic = 'force-dynamic';

function parseMissing(json: string | null): string[] {
  if (!json) return [];
  try { const v = JSON.parse(json); return Array.isArray(v) ? v : []; } catch { return []; }
}
const iso = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : null);
const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : null);

export default async function PermitDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const app = await prisma.permitApplication.findUnique({
    where: { id },
    include: { township: true, employee: true, batch: true },
  });
  if (!app) notFound();

  const eff = effectiveStatus(app);
  const exp = expiryInfo(app);
  const missing = parseMissing(app.missingRequirements);

  // Which lifecycle stages are done, and their dates.
  const stageDate: Record<string, Date | null> = {
    generated: app.createdAt,
    submitted: app.submittedAt,
    approved: app.approvedAt,
  };
  const reached = (key: string) => {
    if (key === 'generated') return true;
    if (key === 'submitted') return ['submitted', 'approved', 'expired'].includes(app.status);
    if (key === 'approved') return ['approved', 'expired'].includes(app.status);
    return false;
  };

  return (
    <>
      <PageHead
        title={`${app.employee.firstName} ${app.employee.lastName}`}
        subtitle={`Permit for ${app.township.name}${app.permitNumber ? ` · #${app.permitNumber}` : ''}`}
        action={
          <>
            {app.generatedPdfPath && <a className="btn" href={`/files/${app.generatedPdfPath}`} target="_blank">↗ View form</a>}
            <form action={regenerateApplication}><input type="hidden" name="id" value={app.id} /><button className="btn primary" type="submit">↻ Re-generate / renew</button></form>
          </>
        }
      />
      <div className="between" style={{ marginBottom: 16 }}>
        <Link className="link" href="/permits">← All permits</Link>
        <div className="row" style={{ gap: 10 }}>
          <StatusBadge map={APPLICATION_STATUS} value={eff} />
          {exp.label && <span className={`pill ${exp.expired ? '' : ''}`}>{exp.label}</span>}
        </div>
      </div>

      {eff === 'expired' && (
        <div className="notice warn" style={{ marginBottom: 16 }}><span>⚠</span><div>This permit has expired{app.expiresAt ? ` (${fmt(app.expiresAt)})` : ''}. Re-generate it to renew.</div></div>
      )}
      {exp.expiringSoon && eff !== 'expired' && (
        <div className="notice warn" style={{ marginBottom: 16 }}><span>⏳</span><div>Expiring soon — {exp.label}{app.expiresAt ? ` (${fmt(app.expiresAt)})` : ''}. Consider renewing.</div></div>
      )}

      <div className="grid grid-2" style={{ alignItems: 'flex-start' }}>
        <div className="stack" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-head"><h3>Lifecycle</h3><StatusBadge map={APPLICATION_STATUS} value={eff} /></div>
            <div className="card-pad">
              <div className="timeline">
                {LIFECYCLE_STAGES.map((s) => {
                  const done = reached(s.key);
                  return (
                    <div className={`tl-item ${done ? 'done' : ''}`} key={s.key}>
                      <div className="tl-dot">{done ? '✓' : ''}</div>
                      <div className="tl-body">
                        <div className="tl-title">{s.label}{done && stageDate[s.key] ? <span className="tl-date"> · {fmt(stageDate[s.key])}</span> : ''}</div>
                        <div className="tl-desc">{s.desc}</div>
                      </div>
                    </div>
                  );
                })}
                {app.status === 'denied' && (
                  <div className="tl-item done" style={{ ['--tl' as string]: 'var(--red)' }}>
                    <div className="tl-dot" style={{ background: 'var(--red)', borderColor: 'var(--red)' }}>✕</div>
                    <div className="tl-body"><div className="tl-title">Denied</div><div className="tl-desc">{app.deniedReason ?? 'No reason recorded.'}</div></div>
                  </div>
                )}
                {eff === 'expired' && (
                  <div className="tl-item done">
                    <div className="tl-dot" style={{ background: 'var(--muted)', borderColor: 'var(--muted)' }}>⌛</div>
                    <div className="tl-body"><div className="tl-title">Expired{app.expiresAt ? <span className="tl-date"> · {fmt(app.expiresAt)}</span> : ''}</div><div className="tl-desc">Permit is no longer valid.</div></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3>At a glance</h3></div>
            <div className="card-pad">
              <div className="kvs">
                <div className="k">Employee</div><div><Link className="link" href={`/employees/${app.employeeId}`}>{app.employee.firstName} {app.employee.lastName}</Link></div>
                <div className="k">Township</div><div><Link className="link" href={`/townships/${app.townshipId}`}>{app.township.name}</Link></div>
                <div className="k">Permit #</div><div>{app.permitNumber ?? '—'}</div>
                <div className="k">Filled out</div><div>{fmt(app.createdAt)}</div>
                <div className="k">Submitted</div><div>{fmt(app.submittedAt) ?? '—'}</div>
                <div className="k">Approved</div><div>{fmt(app.approvedAt) ?? '—'}</div>
                <div className="k">Expires</div><div>{fmt(app.expiresAt) ? `${fmt(app.expiresAt)}${exp.label ? ` (${exp.label})` : ''}` : '—'}</div>
                <div className="k">Print batch</div><div>{app.batch ? <Link className="link" href={`/batches/${app.batchId}`}>{app.batch.label}</Link> : '—'}</div>
              </div>
              <div style={{ marginTop: 14 }}>
                <div className="cell-sub" style={{ marginBottom: 6 }}>Outstanding requirements</div>
                {missing.length === 0 ? <Badge tone="green">None — ready to file</Badge> : <div className="chips">{missing.map((m) => <Badge key={m} tone="red">{m}</Badge>)}</div>}
              </div>
              {app.notes && <p className="muted" style={{ marginTop: 14 }}>{app.notes}</p>}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div><h3>Update status</h3><div className="sub">Track where this permit stands and how long it&apos;s valid.</div></div></div>
          <div className="card-pad">
            <LifecycleForm app={{
              id: app.id, status: app.status, permitNumber: app.permitNumber,
              submittedAt: iso(app.submittedAt), approvedAt: iso(app.approvedAt), expiresAt: iso(app.expiresAt),
              deniedReason: app.deniedReason, notes: app.notes, permitDurationDays: app.township.permitDurationDays,
            }} />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-pad between">
          <div className="muted">Deleting removes this permit record and its filled form.</div>
          <form action={deleteApplication}>
            <input type="hidden" name="id" value={app.id} />
            <input type="hidden" name="redirectTo" value="/permits" />
            <button className="btn danger sm" type="submit">Delete permit</button>
          </form>
        </div>
      </div>
    </>
  );
}
