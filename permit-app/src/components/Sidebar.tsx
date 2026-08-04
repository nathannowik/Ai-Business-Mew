'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/login/actions';
import { ROLE_LABELS } from '@/lib/auth';

type NavItem = { href: string; icon: string; name: string; adminOnly?: boolean };

const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [{ href: '/', icon: '▚', name: 'Dashboard' }],
  },
  {
    label: 'Operations',
    items: [
      { href: '/generate', icon: '✦', name: 'Generate Permits' },
      { href: '/permits', icon: '▤', name: 'Permits' },
      { href: '/renewals', icon: '↻', name: 'Renewals' },
      { href: '/batches', icon: '⎙', name: 'Print Batches' },
    ],
  },
  {
    label: 'Directory',
    items: [
      { href: '/areas', icon: '◈', name: 'Area Groups' },
      { href: '/employees', icon: '☺', name: 'Employees' },
      { href: '/townships', icon: '⌂', name: 'Townships' },
    ],
  },
  {
    label: 'Intake',
    items: [
      { href: '/requests', icon: '✚', name: 'Township Requests' },
      { href: '/emails', icon: '✉', name: 'Clerk Emails' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { href: '/company', icon: '⚙', name: 'Company Profile' },
      { href: '/users', icon: '☰', name: 'Users', adminOnly: true },
    ],
  },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

export default function Sidebar({ user }: { user: { name: string; role: string } | null }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const isAdmin = user?.role === 'admin';

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo">P</div>
        <div>
          PermitPilot
          <small>Soliciting permit ops</small>
        </div>
      </div>
      {NAV.map((group) => {
        const items = group.items.filter((i) => !i.adminOnly || isAdmin);
        if (items.length === 0) return null;
        return (
          <div className="nav-group" key={group.label}>
            <div className="label">{group.label}</div>
            {items.map((item) => (
              <Link key={item.href} href={item.href} className={`nav-item ${isActive(item.href) ? 'active' : ''}`}>
                <span className="ico">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </div>
        );
      })}
      <div className="spacer" />
      {user && (
        <div className="sb-user">
          <div className="avatar" style={{ background: '#1e293b', color: '#cbd5e1' }}>{initials(user.name)}</div>
          <div style={{ minWidth: 0 }}>
            <div className="sb-user-name">{user.name}</div>
            <div className="sb-user-role">{ROLE_LABELS[user.role] ?? user.role}</div>
          </div>
        </div>
      )}
      <form action={logout} style={{ padding: '0 8px 8px' }}>
        <button type="submit" className="nav-item" style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <span className="ico">⇥</span>
          Sign out
        </button>
      </form>
      <style>{`
        .sb-user { display: flex; align-items: center; gap: 10px; padding: 10px; margin: 0 8px 4px; border-top: 1px solid #1e293b; }
        .sb-user-name { color: #e2e8f0; font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sb-user-role { color: #64748b; font-size: 11px; }
      `}</style>
    </aside>
  );
}
