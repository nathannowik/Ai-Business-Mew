import Link from 'next/link';
import { prisma } from '@/lib/db';
import { PageHead } from '@/components/ui';
import { MAP_STATUS_META, townshipMapStatus, type MapStatus } from '@/lib/domain';
import { TownshipMap, type MapPoint } from './TownshipMap';

export const dynamic = 'force-dynamic';

export default async function MapPage() {
  const townships = await prisma.township.findMany({
    include: { applications: { select: { status: true, expiresAt: true } }, areaGroup: true },
    orderBy: { name: 'asc' },
  });

  const statusOf = (t: (typeof townships)[number]): MapStatus => townshipMapStatus(t.applications);

  const points: MapPoint[] = townships
    .filter((t) => t.lat != null && t.lng != null)
    .map((t) => ({
      id: t.id,
      name: t.name,
      lat: t.lat!,
      lng: t.lng!,
      status: statusOf(t),
      sub: [t.county && `${t.county} County`, t.state, t.areaGroup?.name].filter(Boolean).join(' · '),
      permits: t.applications.length,
    }));

  const unlocated = townships.filter((t) => t.lat == null || t.lng == null);
  const counts: Record<MapStatus, number> = {
    approved: townships.filter((t) => statusOf(t) === 'approved').length,
    pending: townships.filter((t) => statusOf(t) === 'pending').length,
    none: townships.filter((t) => statusOf(t) === 'none').length,
  };

  return (
    <>
      <PageHead
        title="Coverage map"
        subtitle="Every township on a satellite map, colored by permit status. Locations are geocoded automatically; set one by hand on a township if needed."
      />

      <div className="wrap-gap" style={{ marginBottom: 16 }}>
        {(['approved', 'pending', 'none'] as MapStatus[]).map((s) => (
          <span key={s} className="pill" style={{ gap: 8 }}>
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: MAP_STATUS_META[s].color, display: 'inline-block', border: '2px solid #fff', boxShadow: '0 0 0 1px var(--border)' }} />
            {MAP_STATUS_META[s].label} <b style={{ marginLeft: 2 }}>{counts[s]}</b>
          </span>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ height: 560, width: '100%' }}>
          {points.length === 0 ? (
            <div className="empty" style={{ height: '100%', display: 'grid', placeContent: 'center' }}>
              <div className="big">🛰</div>
              No townships are placed on the map yet.
              <div className="cell-sub" style={{ marginTop: 6 }}>Add coordinates on a township (auto-filled when geocoding is available).</div>
            </div>
          ) : (
            <TownshipMap points={points} />
          )}
        </div>
      </div>

      {unlocated.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-head"><h3>Not on the map</h3><div className="sub">{unlocated.length} township{unlocated.length === 1 ? '' : 's'} without coordinates</div></div>
          <div className="card-pad">
            <div className="chips">
              {unlocated.map((t) => (
                <Link key={t.id} href={`/townships/${t.id}`} className="pill">{t.name} — add location</Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
