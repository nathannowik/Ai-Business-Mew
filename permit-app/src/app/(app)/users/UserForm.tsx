'use client';

import { Drawer, SubmitBar } from '@/components/Drawer';
import { saveUser } from './actions';

type U = { id: string; email: string; name: string; role: string; active: boolean };

const ROLES = [
  { v: 'admin', l: 'Admin — full access, incl. user management' },
  { v: 'manager', l: 'Manager — everything except user management' },
  { v: 'member', l: 'Member — day-to-day permit operations' },
];

export function UserForm({ user, triggerLabel = '+ Add user', triggerClass = 'btn primary' }: { user?: U; triggerLabel?: string; triggerClass?: string }) {
  const u = user;
  return (
    <Drawer
      title={u ? `Edit ${u.name}` : 'Add user'}
      subtitle="People who can sign in to PermitPilot."
      trigger={(open) => <button className={triggerClass} type="button" onClick={open}>{triggerLabel}</button>}
    >
      {(close) => (
        <form action={async (fd) => { await saveUser(fd); close(); }}>
          {u && <input type="hidden" name="id" value={u.id} />}
          <div className="field"><label>Full name *</label><input className="input" name="name" defaultValue={u?.name} required /></div>
          <div className="field"><label>Email *</label><input className="input" type="email" name="email" defaultValue={u?.email} required /></div>
          <div className="field">
            <label>Role *</label>
            <select className="select" name="role" defaultValue={u?.role ?? 'member'}>
              {ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
            </select>
          </div>
          <div className="field">
            <label>{u ? 'New password' : 'Password *'}</label>
            <input className="input" type="password" name="password" required={!u} placeholder={u ? 'Leave blank to keep current' : 'At least 6 characters'} minLength={6} />
          </div>
          {u && <label className="check"><input type="checkbox" name="active" defaultChecked={u.active} /> Active (can sign in)</label>}
          <SubmitBar close={close} label={u ? 'Save changes' : 'Add user'} />
        </form>
      )}
    </Drawer>
  );
}
