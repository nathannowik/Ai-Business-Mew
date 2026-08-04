'use client';

import React, { useState } from 'react';

export function Drawer({
  trigger,
  title,
  subtitle,
  children,
  wide,
  defaultOpen,
}: {
  trigger: (open: () => void) => React.ReactNode;
  title: string;
  subtitle?: string;
  wide?: boolean;
  defaultOpen?: boolean;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <>
      {trigger(() => setOpen(true))}
      {open && (
        <div className="drawer-overlay" onClick={() => setOpen(false)}>
          <div className={`drawer ${wide ? 'wide' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <div>
                <h3>{title}</h3>
                {subtitle && <div className="sub">{subtitle}</div>}
              </div>
              <button className="btn ghost sm" onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>
            <div className="drawer-body">{children(() => setOpen(false))}</div>
          </div>
        </div>
      )}
      <DrawerStyles />
    </>
  );
}

/** Wrap a server action so the drawer closes after it resolves. */
export function SubmitBar({
  close,
  label = 'Save',
  extra,
}: {
  close: () => void;
  label?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="drawer-foot">
      {extra}
      <div className="row" style={{ marginLeft: 'auto', gap: 10 }}>
        <button type="button" className="btn" onClick={close}>Cancel</button>
        <button type="submit" className="btn primary">{label}</button>
      </div>
    </div>
  );
}

function DrawerStyles() {
  return (
    <style>{`
      .drawer-overlay { position: fixed; inset: 0; background: rgba(16,24,40,.45); backdrop-filter: blur(2px); z-index: 50; display: flex; justify-content: flex-end; animation: fade .12s ease; }
      .drawer { width: 520px; max-width: 100vw; background: var(--panel); height: 100%; display: flex; flex-direction: column; box-shadow: var(--shadow-lg); animation: slidein .16s ease; }
      .drawer.wide { width: 720px; }
      .drawer-head { padding: 18px 22px; border-bottom: 1px solid var(--border); display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
      .drawer-head h3 { font-size: 17px; }
      .drawer-head .sub { color: var(--muted); font-size: 12.5px; margin-top: 3px; }
      .drawer-body { padding: 20px 22px; overflow-y: auto; flex: 1; }
      .drawer-foot { display: flex; align-items: center; gap: 10px; padding-top: 16px; margin-top: 8px; border-top: 1px solid var(--border); position: sticky; bottom: -20px; background: var(--panel); }
      @keyframes slidein { from { transform: translateX(24px); opacity: .6; } to { transform: none; opacity: 1; } }
      @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
    `}</style>
  );
}
