'use client';

import { useMemo, useState } from 'react';
import { generatePermits } from './actions';

type Area = { id: string; name: string; description: string | null; color: string | null };
type Twp = {
  id: string; name: string; areaGroupId: string | null; status: string; hasPdf: boolean;
  county: string | null; state: string | null;
  needsPhoto: boolean; needsBackground: boolean; needsFingerprint: boolean;
  reqShort: string[];
};
type Emp = {
  id: string; name: string; areaGroupId: string | null;
  photoStatus: string; backgroundCheckStatus: string; fingerprintStatus: string;
};

export function GenerateWizard({
  areas, townships, employees, presetArea, presetTownship,
}: {
  areas: Area[]; townships: Twp[]; employees: Emp[]; presetArea?: string; presetTownship?: string;
}) {
  const [areaId, setAreaId] = useState(presetArea && areas.some((a) => a.id === presetArea) ? presetArea : areas[0]?.id ?? '');
  const areaTownships = useMemo(() => townships.filter((t) => t.areaGroupId === areaId && t.status !== 'inactive'), [townships, areaId]);
  const areaEmployees = useMemo(() => employees.filter((e) => e.areaGroupId === areaId), [employees, areaId]);

  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // Initialize selection whenever the area's township set changes. Default: all active
  // townships selected — unless a specific township was preset and lives in this area.
  const selKey = areaTownships.map((t) => t.id).join(',');
  const [initFor, setInitFor] = useState('');
  if (initFor !== selKey) {
    const presetInArea = !!presetTownship && areaTownships.some((t) => t.id === presetTownship);
    const next: Record<string, boolean> = {};
    for (const t of areaTownships) next[t.id] = presetInArea ? t.id === presetTownship : true;
    setSelected(next);
    setInitFor(selKey);
  }

  const chosen = areaTownships.filter((t) => selected[t.id]);
  const permitCount = chosen.length * areaEmployees.length;

  function toggle(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }
  function setAll(on: boolean) {
    const next: Record<string, boolean> = {};
    for (const t of areaTownships) next[t.id] = on;
    setSelected(next);
  }

  // Aggregate missing requirements per employee across the chosen townships.
  const readiness = areaEmployees.map((e) => {
    const missing = new Set<string>();
    for (const t of chosen) {
      if (t.needsPhoto && e.photoStatus !== 'complete') missing.add('2×2 photo');
      if (t.needsBackground && e.backgroundCheckStatus !== 'complete') missing.add('Background check');
      if (t.needsFingerprint && e.fingerprintStatus !== 'complete') missing.add('Fingerprints');
    }
    return { emp: e, missing: [...missing] };
  });
  const anyMissing = readiness.some((r) => r.missing.length > 0);
  const packetCount = chosen.filter((t) => !t.hasPdf).length;

  return (
    <div className="grid grid-2" style={{ alignItems: 'flex-start' }}>
      <div className="stack" style={{ gap: 16 }}>
        <div className="card">
          <div className="card-head"><div><h3>1 · Choose an area</h3><div className="sub">Permits generate for everyone in this area.</div></div></div>
          <div className="card-pad">
            <div className="chips">
              {areas.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`btn ${areaId === a.id ? 'primary' : ''}`}
                  onClick={() => setAreaId(a.id)}
                >
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: a.color ?? '#2563eb', display: 'inline-block' }} />
                  {a.name}
                </button>
              ))}
            </div>
            <div className="muted" style={{ marginTop: 12 }}>{areaEmployees.length} active employee{areaEmployees.length === 1 ? '' : 's'} in this area.</div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div><h3>2 · Choose townships</h3><div className="sub">Which townships to apply for.</div></div>
            <div className="row" style={{ gap: 6 }}>
              <button type="button" className="btn ghost sm" onClick={() => setAll(true)}>All</button>
              <button type="button" className="btn ghost sm" onClick={() => setAll(false)}>None</button>
            </div>
          </div>
          <div className="card-pad">
            {areaTownships.length === 0 ? (
              <div className="muted">No townships designated to this area yet. Assign some on the Townships page.</div>
            ) : (
              <div className="stack" style={{ gap: 8 }}>
                {areaTownships.map((t) => (
                  <label key={t.id} className="check" style={{ justifyContent: 'space-between' }}>
                    <span className="row" style={{ gap: 10 }}>
                      <input type="checkbox" checked={!!selected[t.id]} onChange={() => toggle(t.id)} />
                      <span>
                        <span className="cell-strong">{t.name}</span>
                        <span className="cell-sub"> · {t.reqShort.length} requirement{t.reqShort.length === 1 ? '' : 's'}</span>
                      </span>
                    </span>
                    {t.hasPdf ? <span className="badge green"><span className="dot" />Real form</span> : <span className="badge amber"><span className="dot" />Packet</span>}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ position: 'sticky', top: 76 }}>
        <div className="card-head"><h3>3 · Review & generate</h3></div>
        <div className="card-pad">
          <div className="grid grid-3" style={{ gap: 10, marginBottom: 16 }}>
            <MiniStat k="Townships" v={chosen.length} />
            <MiniStat k="Employees" v={areaEmployees.length} />
            <MiniStat k="Permits" v={permitCount} accent />
          </div>

          {packetCount > 0 && (
            <div className="notice warn" style={{ marginBottom: 12 }}>
              <span>⚠</span>
              <div>{packetCount} selected township{packetCount === 1 ? ' has' : 's have'} no uploaded permit PDF — a standardized packet will be generated instead. Upload the real form on the township page to auto-fill it.</div>
            </div>
          )}

          {anyMissing ? (
            <div className="notice warn" style={{ marginBottom: 12 }}>
              <span>⚠</span>
              <div>Some employees are missing requirements for the selected townships. Permits still generate, but flagged items must be completed before filing.</div>
            </div>
          ) : chosen.length > 0 && (
            <div className="notice success" style={{ marginBottom: 12 }}><span>✓</span><div>All employees are compliant for the selected townships.</div></div>
          )}

          {areaEmployees.length > 0 && chosen.length > 0 && (
            <div className="table-wrap" style={{ marginBottom: 16, maxHeight: 260, overflowY: 'auto' }}>
              <table className="tbl">
                <thead><tr><th>Employee</th><th>Missing for selection</th></tr></thead>
                <tbody>
                  {readiness.map((r) => (
                    <tr key={r.emp.id}>
                      <td className="cell-strong">{r.emp.name}</td>
                      <td>{r.missing.length === 0 ? <span className="badge green"><span className="dot" />Ready</span> : <span className="chips">{r.missing.map((m) => <span key={m} className="badge red"><span className="dot" />{m}</span>)}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <form action={generatePermits}>
            <input type="hidden" name="areaId" value={areaId} />
            {chosen.map((t) => <input key={t.id} type="hidden" name="townshipIds" value={t.id} />)}
            <button className="btn primary lg" type="submit" disabled={permitCount === 0} style={{ width: '100%' }}>
              ✦ Generate {permitCount || ''} permit{permitCount === 1 ? '' : 's'} → print batch
            </button>
          </form>
          <div className="faint center" style={{ marginTop: 10, fontSize: 12 }}>Produces one combined, print-ready PDF you can send straight to the printer.</div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ k, v, accent }: { k: string; v: number; accent?: boolean }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 4px', border: '1px solid var(--border)', borderRadius: 10, background: accent ? 'var(--brand-soft)' : 'var(--panel-2)' }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: accent ? 'var(--brand)' : 'var(--text)' }}>{v}</div>
      <div className="cell-sub">{k}</div>
    </div>
  );
}
