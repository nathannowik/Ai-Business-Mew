'use client';

import { Drawer, SubmitBar } from '@/components/Drawer';
import { saveRequest } from './actions';

type Area = { id: string; name: string };
type Req = {
  id: string; townshipName: string; state: string | null; county: string | null; areaGroupId: string | null;
  requestedBy: string | null; priority: string; status: string; knownRequirements: string | null;
  clerkContact: string | null; notes: string | null;
};

export function RequestForm({ areas, request, triggerLabel = '+ Request a township', triggerClass = 'btn primary' }: { areas: Area[]; request?: Req; triggerLabel?: string; triggerClass?: string }) {
  const r = request;
  return (
    <Drawer
      title={r ? `Edit request` : 'Request a new township'}
      subtitle="Submit a township you want permits for. It gets researched, then converted into a tracked township."
      trigger={(open) => <button className={triggerClass} type="button" onClick={open}>{triggerLabel}</button>}
    >
      {(close) => (
        <form action={async (fd) => { await saveRequest(fd); close(); }}>
          {r && <input type="hidden" name="id" value={r.id} />}
          <div className="form-grid">
            <div className="field full"><label>Township name *</label><input className="input" name="townshipName" defaultValue={r?.townshipName} placeholder="Alpine Township" required /></div>
            <div className="field"><label>County</label><input className="input" name="county" defaultValue={r?.county ?? ''} /></div>
            <div className="field"><label>State</label><input className="input" name="state" defaultValue={r?.state ?? ''} /></div>
            <div className="field">
              <label>Area group</label>
              <select className="select" name="areaGroupId" defaultValue={r?.areaGroupId ?? ''}>
                <option value="">— Unassigned —</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Priority</label>
              <select className="select" name="priority" defaultValue={r?.priority ?? 'normal'}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="field"><label>Requested by</label><input className="input" name="requestedBy" defaultValue={r?.requestedBy ?? ''} /></div>
            {r && (
              <div className="field">
                <label>Status</label>
                <select className="select" name="status" defaultValue={r.status}>
                  <option value="new">New</option>
                  <option value="researching">Researching</option>
                  <option value="info_needed">Info needed</option>
                  <option value="ready">Ready to add</option>
                  <option value="added">Added</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
            )}
            <div className="field full"><label>Clerk contact (if known)</label><input className="input" name="clerkContact" defaultValue={r?.clerkContact ?? ''} /></div>
            <div className="field full"><label>Known requirements</label><textarea className="textarea" name="knownRequirements" defaultValue={r?.knownRequirements ?? ''} /></div>
            <div className="field full"><label>Notes</label><textarea className="textarea" name="notes" defaultValue={r?.notes ?? ''} /></div>
          </div>
          <SubmitBar close={close} label={r ? 'Save changes' : 'Submit request'} />
        </form>
      )}
    </Drawer>
  );
}
