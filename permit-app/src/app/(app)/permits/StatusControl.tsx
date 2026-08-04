'use client';

import { setApplicationStatus } from './actions';

const OPTIONS = [
  { v: 'generated', l: 'Generated' },
  { v: 'submitted', l: 'Submitted' },
  { v: 'approved', l: 'Approved' },
  { v: 'denied', l: 'Denied' },
  { v: 'expired', l: 'Expired' },
];

export function StatusControl({ id, status }: { id: string; status: string }) {
  return (
    <form action={setApplicationStatus} className="row" style={{ gap: 6 }}>
      <input type="hidden" name="id" value={id} />
      <select name="status" defaultValue={status} className="select" style={{ padding: '5px 8px', width: 'auto' }}>
        {OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
      <button className="btn ghost sm" type="submit" title="Update">↻</button>
    </form>
  );
}
