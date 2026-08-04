import Link from 'next/link';
import React from 'react';

export function Badge({ tone = 'gray', children }: { tone?: string; children: React.ReactNode }) {
  return (
    <span className={`badge ${tone}`}>
      <span className="dot" />
      {children}
    </span>
  );
}

export function StatusBadge({ map, value }: { map: Record<string, { label: string; tone: string }>; value: string }) {
  const meta = map[value] ?? { label: value, tone: 'gray' };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function PageHead({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && <div className="btn-row">{action}</div>}
    </div>
  );
}

export function Empty({
  icon = '∅',
  title,
  hint,
  action,
}: {
  icon?: string;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="big">{icon}</div>
      <div style={{ fontWeight: 650, color: 'var(--text)', marginBottom: 4 }}>{title}</div>
      {hint && <div style={{ maxWidth: 420, margin: '0 auto 14px' }}>{hint}</div>}
      {action}
    </div>
  );
}

export function Avatar({ first, last }: { first?: string | null; last?: string | null }) {
  const initials = `${(first ?? '').charAt(0)}${(last ?? '').charAt(0)}`.toUpperCase() || '?';
  return <div className="avatar">{initials}</div>;
}

export function LinkBtn({
  href,
  children,
  variant = '',
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  variant?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={`btn ${variant} ${className}`.trim()}>
      {children}
    </Link>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`card ${className}`.trim()}>{children}</div>;
}
