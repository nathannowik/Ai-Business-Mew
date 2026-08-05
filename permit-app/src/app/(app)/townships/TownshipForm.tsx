'use client';

import { Drawer, SubmitBar } from '@/components/Drawer';
import { saveTownship } from './actions';
import { REQUIREMENTS, parseExtraRequirements } from '@/lib/domain';

type Area = { id: string; name: string };
type T = Record<string, unknown> & {
  id: string; name: string; state: string | null; county: string | null; areaGroupId: string | null;
  clerkOfficeName: string | null; clerkName: string | null; clerkEmail: string | null; clerkPhone: string | null;
  officeAddress: string | null; officeCity: string | null; officeZip: string | null; website: string | null;
  permitFee: number | null; processingDays: number | null; permitDurationDays: number | null;
  renewalNotes: string | null; extraRequirements: string | null; requirementsNotes: string | null;
  lat: number | null; lng: number | null;
  status: string; notes: string | null;
};

export function TownshipForm({ areas, township, triggerLabel = '+ Add township', triggerClass = 'btn primary' }: { areas: Area[]; township?: T; triggerLabel?: string; triggerClass?: string }) {
  const t = township;
  const extras = t ? parseExtraRequirements(t.extraRequirements).join('\n') : '';
  return (
    <Drawer
      wide
      title={t ? `Edit ${t.name}` : 'Add township'}
      subtitle="Capture the clerk contact, the exact requirements, and logistics for this township."
      trigger={(open) => <button className={triggerClass} type="button" onClick={open}>{triggerLabel}</button>}
    >
      {(close) => (
        <form action={async (fd) => { await saveTownship(fd); close(); }}>
          {t && <input type="hidden" name="id" value={t.id} />}

          <fieldset>
            <legend>Township</legend>
            <div className="form-grid">
              <div className="field full"><label>Name *</label><input className="input" name="name" defaultValue={t?.name} placeholder="Cascade Township" required /></div>
              <div className="field"><label>County</label><input className="input" name="county" defaultValue={t?.county ?? ''} /></div>
              <div className="field"><label>State</label><input className="input" name="state" defaultValue={t?.state ?? ''} /></div>
              <div className="field">
                <label>Area group</label>
                <select className="select" name="areaGroupId" defaultValue={t?.areaGroupId ?? ''}>
                  <option value="">— Unassigned —</option>
                  {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Status</label>
                <select className="select" name="status" defaultValue={t?.status ?? 'active'}>
                  <option value="active">Active</option>
                  <option value="needs_info">Needs info</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Requirements</legend>
            <div className="check-grid">
              {REQUIREMENTS.map((r) => (
                <label className="check" key={r.key}>
                  <input type="checkbox" name={r.key} defaultChecked={t ? !!t[r.key] : false} /> {r.label}
                </label>
              ))}
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Other requirements <span className="hint">(one per line)</span></label>
              <textarea className="textarea" name="extraRequirements" defaultValue={extras} placeholder={'$5,000 surety bond\nTwo local references'} />
            </div>
            <div className="field"><label>Requirement notes</label><textarea className="textarea" name="requirementsNotes" defaultValue={t?.requirementsNotes ?? ''} /></div>
          </fieldset>

          <fieldset>
            <legend>Clerk / office contact</legend>
            <div className="form-grid">
              <div className="field"><label>Office name</label><input className="input" name="clerkOfficeName" defaultValue={t?.clerkOfficeName ?? ''} /></div>
              <div className="field"><label>Clerk name</label><input className="input" name="clerkName" defaultValue={t?.clerkName ?? ''} /></div>
              <div className="field"><label>Clerk email</label><input className="input" name="clerkEmail" type="email" defaultValue={t?.clerkEmail ?? ''} /></div>
              <div className="field"><label>Clerk phone</label><input className="input" name="clerkPhone" defaultValue={t?.clerkPhone ?? ''} /></div>
              <div className="field full"><label>Office address</label><input className="input" name="officeAddress" defaultValue={t?.officeAddress ?? ''} /></div>
              <div className="field"><label>Office city</label><input className="input" name="officeCity" defaultValue={t?.officeCity ?? ''} /></div>
              <div className="field"><label>Office ZIP</label><input className="input" name="officeZip" defaultValue={t?.officeZip ?? ''} /></div>
              <div className="field full"><label>Website</label><input className="input" name="website" defaultValue={t?.website ?? ''} /></div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Logistics</legend>
            <div className="form-grid">
              <div className="field"><label>Permit fee ($)</label><input className="input" name="permitFee" type="number" step="0.01" defaultValue={t?.permitFee ?? ''} /></div>
              <div className="field"><label>Processing time (days)</label><input className="input" name="processingDays" type="number" defaultValue={t?.processingDays ?? ''} /></div>
              <div className="field"><label>Permit valid for (days)</label><input className="input" name="permitDurationDays" type="number" defaultValue={t?.permitDurationDays ?? ''} /></div>
            </div>
            <div className="field"><label>Renewal notes</label><input className="input" name="renewalNotes" defaultValue={t?.renewalNotes ?? ''} /></div>
            <div className="form-grid">
              <div className="field"><label>Map latitude</label><input className="input" name="lat" type="number" step="any" defaultValue={t?.lat ?? ''} placeholder="auto-filled" /></div>
              <div className="field"><label>Map longitude</label><input className="input" name="lng" type="number" step="any" defaultValue={t?.lng ?? ''} /><span className="hint">Leave blank to auto-locate from name + county/state.</span></div>
            </div>
            <div className="field"><label>General notes</label><textarea className="textarea" name="notes" defaultValue={t?.notes ?? ''} /></div>
          </fieldset>

          <SubmitBar close={close} label={t ? 'Save changes' : 'Add township'} />
        </form>
      )}
    </Drawer>
  );
}
