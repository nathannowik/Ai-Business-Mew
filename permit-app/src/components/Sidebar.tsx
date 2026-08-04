'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/login/actions';

const NAV: { label: string; items: { href: string; icon: string; name: string }[] }[] = [
  {
    label: 'Overview',
    items: [{ href: '/', icon: '▚', name: 'Dashboard' }],
  },
  {
    label: 'Operations',
    items: [
      { href: '/generate', icon: '✦', name: 'Generate Permits' },
      { href: '/permits', icon: '▤', name: 'Permits' },
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
    items: [{ href: '/company', icon: '⚙', name: 'Company Profile' }],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo">P</div>
        <div>
          PermitPilot
          <small>Soliciting permit ops</small>
        </div>
      </div>
      {NAV.map((group) => (
        <div className="nav-group" key={group.label}>
          <div className="label">{group.label}</div>
          {group.items.map((item) => (
            <Link key={item.href} href={item.href} className={`nav-item ${isActive(item.href) ? 'active' : ''}`}>
              <span className="ico">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </div>
      ))}
      <div className="spacer" />
      <form action={logout} style={{ padding: '0 8px 8px' }}>
        <button type="submit" className="nav-item" style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <span className="ico">⇥</span>
          Sign out
        </button>
      </form>
      <div className="foot">Turn “I need permits for Area 3” into printed, ready-to-file forms.</div>
    </aside>
  );
}
