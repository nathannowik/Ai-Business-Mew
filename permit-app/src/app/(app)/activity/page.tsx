import { prisma } from '@/lib/db';
import { PageHead, Badge, Empty } from '@/components/ui';
import { activityMeta } from '@/lib/activity';

export const dynamic = 'force-dynamic';

function timeAgo(d: Date): string {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString();
}

export default async function ActivityPage() {
  const logs = await prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });

  return (
    <>
      <PageHead title="Activity" subtitle="An audit trail of who did what — permit generation, status changes, imports, and account changes." />
      <div className="card">
        {logs.length === 0 ? (
          <Empty icon="🕑" title="No activity yet" hint="Actions like generating permits or updating statuses will show up here." />
        ) : (
          <div className="card-pad">
            <div className="feed">
              {logs.map((l) => {
                const m = activityMeta(l.action);
                return (
                  <div className="feed-item" key={l.id}>
                    <div className={`feed-ico ${m.tone}`}>{m.icon}</div>
                    <div className="feed-body">
                      <div className="feed-line">
                        <span className="cell-strong">{l.userName}</span> <span className="muted">{m.label.toLowerCase()}</span>
                        {l.detail && <span> — {l.detail}</span>}
                      </div>
                      <div className="cell-sub">{timeAgo(l.createdAt)} · {new Date(l.createdAt).toLocaleString()}</div>
                    </div>
                    <Badge tone={m.tone}>{l.action}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <style>{`
        .feed { display: flex; flex-direction: column; }
        .feed-item { display: flex; align-items: center; gap: 12px; padding: 12px 4px; border-bottom: 1px solid var(--border); }
        .feed-item:last-child { border-bottom: none; }
        .feed-ico { flex: 0 0 34px; width: 34px; height: 34px; border-radius: 9px; display: grid; place-items: center; font-size: 15px; background: var(--gray-soft); }
        .feed-ico.blue { background: var(--brand-soft); } .feed-ico.green { background: var(--green-soft); }
        .feed-ico.amber { background: var(--amber-soft); } .feed-ico.red { background: var(--red-soft); }
        .feed-body { flex: 1; min-width: 0; }
        .feed-line { font-size: 13.5px; }
      `}</style>
    </>
  );
}
