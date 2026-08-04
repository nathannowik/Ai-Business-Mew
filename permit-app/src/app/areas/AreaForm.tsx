'use client';

import { Drawer, SubmitBar } from '@/components/Drawer';
import { saveArea } from './actions';

type Area = { id: string; name: string; description: string | null; color: string | null };

const COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#db2777', '#475569'];

export function AreaForm({ area, triggerLabel = '+ New area group', triggerClass = 'btn primary' }: { area?: Area; triggerLabel?: string; triggerClass?: string }) {
  return (
    <Drawer
      title={area ? `Edit ${area.name}` : 'New area group'}
      subtitle="Group employees and designate townships to a team, e.g. “Area 3”."
      trigger={(open) => <button className={triggerClass} type="button" onClick={open}>{triggerLabel}</button>}
    >
      {(close) => (
        <form action={async (fd) => { await saveArea(fd); close(); }}>
          {area && <input type="hidden" name="id" value={area.id} />}
          <div className="field"><label>Name *</label><input className="input" name="name" defaultValue={area?.name} placeholder="Area 3" required /></div>
          <div className="field"><label>Description</label><input className="input" name="description" defaultValue={area?.description ?? ''} placeholder="Kent & Ottawa suburbs" /></div>
          <div className="field">
            <label>Color</label>
            <div className="chips">
              {COLORS.map((c, i) => (
                <label key={c} className="row" style={{ cursor: 'pointer' }}>
                  <input type="radio" name="color" value={c} defaultChecked={area ? area.color === c : i === 0} style={{ display: 'none' }} />
                  <span style={{ width: 26, height: 26, borderRadius: 7, background: c, display: 'inline-block', outline: '2px solid transparent' }} />
                </label>
              ))}
            </div>
            <span className="hint">Used as the area’s marker throughout the app.</span>
          </div>
          <SubmitBar close={close} label={area ? 'Save changes' : 'Create area'} />
        </form>
      )}
    </Drawer>
  );
}
