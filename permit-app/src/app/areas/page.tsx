import Link from 'next/link';
import { prisma } from '@/lib/db';
import { PageHead, Empty, LinkBtn } from '@/components/ui';
import { AreaForm } from './AreaForm';
import { deleteArea } from './actions';

export const dynamic = 'force-dynamic';

export default async function AreasPage() {
  const areas = await prisma.areaGroup.findMany({
    include: { _count: { select: { employees: true, townships: true } } },
    orderBy: { name: 'asc' },
  });

  return (
    <>
      <PageHead
        title="Area groups"
        subtitle="Teams that cover a region. Employees belong to an area, and townships are designated to it — that pairing drives permit generation."
        action={<AreaForm />}
      />

      {areas.length === 0 ? (
        <div className="card"><Empty icon="◈" title="No area groups yet" hint="Create your first area (like “Area 3”), then assign employees and townships to it." /></div>
      ) : (
        <div className="grid grid-3">
          {areas.map((a) => (
            <div className="card card-pad" key={a.id}>
              <div className="between">
                <div className="row">
                  <span style={{ width: 12, height: 12, borderRadius: 4, background: a.color ?? '#2563eb', display: 'inline-block' }} />
                  <Link href={`/areas/${a.id}`} style={{ fontWeight: 700, fontSize: 16 }}>{a.name}</Link>
                </div>
                <AreaForm area={a} triggerLabel="Edit" triggerClass="btn ghost sm" />
              </div>
              <p className="muted" style={{ margin: '6px 0 14px', minHeight: 20 }}>{a.description ?? '—'}</p>
              <div className="row" style={{ gap: 18 }}>
                <div><div style={{ fontSize: 22, fontWeight: 700 }}>{a._count.employees}</div><div className="cell-sub">Employees</div></div>
                <div><div style={{ fontSize: 22, fontWeight: 700 }}>{a._count.townships}</div><div className="cell-sub">Townships</div></div>
              </div>
              <hr className="sep" />
              <div className="btn-row">
                <LinkBtn href={`/areas/${a.id}`} variant="sm">View</LinkBtn>
                <LinkBtn href={`/generate?area=${a.id}`} variant="primary sm">✦ Generate</LinkBtn>
                <form action={deleteArea} style={{ marginLeft: 'auto' }}>
                  <input type="hidden" name="id" value={a.id} />
                  <button className="btn ghost sm" title="Delete area">🗑</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
