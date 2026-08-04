'use client';

import { useState } from 'react';
import { updateApplication } from '../actions';

type App = {
  id: string; status: string; permitNumber: string | null;
  submittedAt: string | null; approvedAt: string | null; expiresAt: string | null;
  deniedReason: string | null; notes: string | null;
  permitDurationDays: number | null;
};

const STATUSES = [
  { v: 'generated', l: 'Filled out (not yet submitted)' },
  { v: 'submitted', l: 'Submitted to clerk' },
  { v: 'approved', l: 'Approved' },
  { v: 'denied', l: 'Denied' },
  { v: 'expired', l: 'Expired' },
];

export function LifecycleForm({ app }: { app: App }) {
  const [status, setStatus] = useState(app.status);
  const showSubmitted = status !== 'generated';
  const showApproval = status === 'approved' || status === 'expired';
  const showDenied = status === 'denied';

  return (
    <form action={updateApplication}>
      <input type="hidden" name="id" value={app.id} />
      <div className="form-grid">
        <div className="field">
          <label>Status</label>
          <select className="select" name="status" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Permit number</label>
          <input className="input" name="permitNumber" defaultValue={app.permitNumber ?? ''} placeholder="e.g. SP-2026-0142" />
        </div>

        {showSubmitted && (
          <div className="field">
            <label>Submitted on</label>
            <input className="input" type="date" name="submittedAt" defaultValue={app.submittedAt ?? ''} />
          </div>
        )}

        {showApproval && (
          <>
            <div className="field">
              <label>Approved on</label>
              <input className="input" type="date" name="approvedAt" defaultValue={app.approvedAt ?? ''} />
            </div>
            <div className="field">
              <label>Valid for (days)</label>
              <input className="input" type="number" name="durationDays" defaultValue={app.permitDurationDays ?? ''} placeholder="e.g. 180" />
              <span className="hint">Used to compute the expiry from the approval date if no exact date is set.</span>
            </div>
            <div className="field">
              <label>Expires on</label>
              <input className="input" type="date" name="expiresAt" defaultValue={app.expiresAt ?? ''} />
              <span className="hint">Overrides the “valid for” calculation.</span>
            </div>
          </>
        )}

        {showDenied && (
          <div className="field full">
            <label>Reason for denial</label>
            <input className="input" name="deniedReason" defaultValue={app.deniedReason ?? ''} />
          </div>
        )}

        <div className="field full">
          <label>Notes</label>
          <textarea className="textarea" name="notes" defaultValue={app.notes ?? ''} />
        </div>
      </div>
      <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn primary" type="submit">Save permit status</button>
      </div>
    </form>
  );
}
