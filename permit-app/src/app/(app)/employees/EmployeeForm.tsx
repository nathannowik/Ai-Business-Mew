'use client';

import { Drawer, SubmitBar } from '@/components/Drawer';
import { saveEmployee } from './actions';

type Area = { id: string; name: string };
type Emp = {
  id: string; firstName: string; lastName: string; email: string | null; phone: string | null;
  address: string | null; city: string | null; state: string | null; zip: string | null;
  dob: Date | null; driverLicense: string | null; driverLicenseState: string | null; ssnLast4: string | null;
  vehicleMakeModel: string | null; vehicleColor: string | null; vehiclePlate: string | null;
  photoStatus: string; backgroundCheckStatus: string; fingerprintStatus: string;
  active: boolean; notes: string | null; areaGroupId: string | null;
};

const STATUS_OPTS = [
  { v: 'missing', l: 'Missing' },
  { v: 'pending', l: 'Pending' },
  { v: 'complete', l: 'Complete' },
];

export function EmployeeForm({ areas, employee, triggerLabel = '+ Add employee', triggerClass = 'btn primary' }: { areas: Area[]; employee?: Emp; triggerLabel?: string; triggerClass?: string }) {
  const e = employee;
  const dobVal = e?.dob ? new Date(e.dob).toISOString().slice(0, 10) : '';
  return (
    <Drawer
      title={e ? `Edit ${e.firstName} ${e.lastName}` : 'Add employee'}
      subtitle="Details flow into permit forms; compliance items are tracked per township."
      trigger={(open) => (
        <button className={triggerClass} onClick={open} type="button">{triggerLabel}</button>
      )}
    >
      {(close) => (
        <form action={async (fd) => { await saveEmployee(fd); close(); }} encType="multipart/form-data">
          {e && <input type="hidden" name="id" value={e.id} />}
          <fieldset>
            <legend>Identity</legend>
            <div className="form-grid">
              <div className="field"><label>First name *</label><input className="input" name="firstName" defaultValue={e?.firstName} required /></div>
              <div className="field"><label>Last name *</label><input className="input" name="lastName" defaultValue={e?.lastName} required /></div>
              <div className="field"><label>Email</label><input className="input" name="email" type="email" defaultValue={e?.email ?? ''} /></div>
              <div className="field"><label>Phone</label><input className="input" name="phone" defaultValue={e?.phone ?? ''} /></div>
              <div className="field"><label>Date of birth</label><input className="input" name="dob" type="date" defaultValue={dobVal} /></div>
              <div className="field">
                <label>Area group</label>
                <select className="select" name="areaGroupId" defaultValue={e?.areaGroupId ?? ''}>
                  <option value="">— Unassigned —</option>
                  {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Address</legend>
            <div className="field"><label>Street</label><input className="input" name="address" defaultValue={e?.address ?? ''} /></div>
            <div className="form-grid">
              <div className="field"><label>City</label><input className="input" name="city" defaultValue={e?.city ?? ''} /></div>
              <div className="field"><label>State</label><input className="input" name="state" defaultValue={e?.state ?? ''} /></div>
              <div className="field"><label>ZIP</label><input className="input" name="zip" defaultValue={e?.zip ?? ''} /></div>
            </div>
          </fieldset>

          <fieldset>
            <legend>License & vehicle</legend>
            <div className="form-grid">
              <div className="field"><label>Driver&apos;s license #</label><input className="input" name="driverLicense" defaultValue={e?.driverLicense ?? ''} /></div>
              <div className="field"><label>License state</label><input className="input" name="driverLicenseState" defaultValue={e?.driverLicenseState ?? ''} /></div>
              <div className="field"><label>SSN (last 4)</label><input className="input" name="ssnLast4" maxLength={4} defaultValue={e?.ssnLast4 ?? ''} /></div>
              <div className="field"><label>Vehicle make/model</label><input className="input" name="vehicleMakeModel" defaultValue={e?.vehicleMakeModel ?? ''} /></div>
              <div className="field"><label>Vehicle color</label><input className="input" name="vehicleColor" defaultValue={e?.vehicleColor ?? ''} /></div>
              <div className="field"><label>Plate</label><input className="input" name="vehiclePlate" defaultValue={e?.vehiclePlate ?? ''} /></div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Compliance</legend>
            <div className="form-grid">
              <div className="field"><label>2×2 photo</label><select className="select" name="photoStatus" defaultValue={e?.photoStatus ?? 'missing'}>{STATUS_OPTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}</select></div>
              <div className="field"><label>Background check</label><select className="select" name="backgroundCheckStatus" defaultValue={e?.backgroundCheckStatus ?? 'missing'}>{STATUS_OPTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}</select></div>
              <div className="field"><label>Fingerprints</label><select className="select" name="fingerprintStatus" defaultValue={e?.fingerprintStatus ?? 'missing'}>{STATUS_OPTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}</select></div>
              <div className="field"><label>Upload 2×2 photo</label><input className="input" name="photo" type="file" accept="image/*" /><span className="hint">Uploading marks the photo complete.</span></div>
            </div>
            <label className="check" style={{ marginTop: 6 }}><input type="checkbox" name="active" defaultChecked={e ? e.active : true} /> Active (currently knocking)</label>
          </fieldset>

          <div className="field"><label>Notes</label><textarea className="textarea" name="notes" defaultValue={e?.notes ?? ''} /></div>

          <SubmitBar close={close} label={e ? 'Save changes' : 'Add employee'} />
        </form>
      )}
    </Drawer>
  );
}
