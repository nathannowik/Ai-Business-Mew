'use client';

import { uploadDocument, deleteDocument } from '@/app/(app)/documents/actions';
import { DOC_CATEGORIES } from '@/lib/documents';

export type DocItem = {
  id: string; name: string; category: string; storageKey: string;
  mimeType: string | null; size: number | null; createdAt: string;
};

const catLabel = (v: string) => DOC_CATEGORIES.find((c) => c.value === v)?.label ?? v;
function fmtSize(n: number | null) {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
const isImg = (m: string | null) => !!m && m.startsWith('image/');

export function DocumentsPanel({ employeeId, townshipId, docs }: { employeeId?: string; townshipId?: string; docs: DocItem[] }) {
  return (
    <div>
      {docs.length === 0 ? (
        <div className="empty" style={{ padding: '20px' }}><div className="big" style={{ fontSize: 24 }}>📎</div>No documents attached yet.</div>
      ) : (
        <div className="stack" style={{ gap: 8, marginBottom: 16 }}>
          {docs.map((d) => (
            <div key={d.id} className="row between" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
              <div className="row" style={{ gap: 10, minWidth: 0 }}>
                <span style={{ fontSize: 18 }}>{isImg(d.mimeType) ? '🖼' : '📄'}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="cell-strong" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                  <div className="cell-sub"><span className="tag-req">{catLabel(d.category)}</span> {fmtSize(d.size)}</div>
                </div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <a className="btn ghost sm" href={`/files/${d.storageKey}`} target="_blank" rel="noreferrer">↗</a>
                <form action={deleteDocument}><input type="hidden" name="id" value={d.id} /><button className="btn ghost sm" title="Delete">🗑</button></form>
              </div>
            </div>
          ))}
        </div>
      )}

      <form action={uploadDocument} className="card" style={{ background: 'var(--panel-2)', padding: 14 }}>
        {employeeId && <input type="hidden" name="employeeId" value={employeeId} />}
        {townshipId && <input type="hidden" name="townshipId" value={townshipId} />}
        <div className="form-grid">
          <div className="field"><label>Label</label><input className="input" name="name" placeholder="e.g. 2026 insurance certificate" /></div>
          <div className="field">
            <label>Category</label>
            <select className="select" name="category" defaultValue="other">
              {DOC_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label>File</label><input className="input" type="file" name="file" required accept="application/pdf,image/*" /></div>
        <div className="btn-row" style={{ justifyContent: 'flex-end' }}><button className="btn primary sm" type="submit">⬆ Attach document</button></div>
      </form>
    </div>
  );
}
