'use client';

import { useState } from 'react';
import { saveFieldMappings } from '../actions';
import { DATA_TOKENS } from '@/lib/domain';

const GROUPS = ['Employee', 'Company', 'Township', 'Other'] as const;

export function FieldMapper({
  townshipId,
  fields,
  mappings,
}: {
  townshipId: string;
  fields: string[];
  mappings: Record<string, string>;
}) {
  const [saved, setSaved] = useState(false);
  const mappedCount = fields.filter((f) => mappings[f]).length;

  if (fields.length === 0) {
    return (
      <div className="notice warn">
        <span>⚠</span>
        <div>No fillable form fields were detected in this PDF. It may be a flat/scanned form. Employees will still get a generated cover packet, or you can turn it in by hand.</div>
      </div>
    );
  }

  return (
    <form action={async (fd) => { await saveFieldMappings(fd); setSaved(true); }}>
      <input type="hidden" name="townshipId" value={townshipId} />
      <div className="between" style={{ marginBottom: 12 }}>
        <div className="muted">{mappedCount} of {fields.length} fields mapped</div>
        <div className="row" style={{ gap: 10 }}>
          {saved && <span className="badge green"><span className="dot" />Saved</span>}
          <button className="btn primary sm" type="submit">Save mapping</button>
        </div>
      </div>
      <div className="progress" style={{ marginBottom: 16 }}><span style={{ width: `${fields.length ? (mappedCount / fields.length) * 100 : 0}%` }} /></div>

      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th style={{ width: '45%' }}>PDF field</th><th>Fill with</th></tr></thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f}>
                <td><code style={{ fontSize: 12.5, background: 'var(--gray-soft)', padding: '2px 7px', borderRadius: 6 }}>{f}</code></td>
                <td>
                  <select className="select" name={`map__${f}`} defaultValue={mappings[f] ?? ''} onChange={() => setSaved(false)}>
                    <option value="">— Leave blank —</option>
                    {GROUPS.map((g) => (
                      <optgroup label={g} key={g}>
                        {DATA_TOKENS.filter((tok) => tok.group === g).map((tok) => (
                          <option key={tok.token} value={tok.token}>{tok.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </form>
  );
}
