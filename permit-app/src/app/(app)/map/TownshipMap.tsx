'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import { MAP_STATUS_META, type MapStatus } from '@/lib/domain';

export type MapPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: MapStatus;
  sub: string;
  permits: number;
};

export function TownshipMap({ points }: { points: MapPoint[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !ref.current || mapRef.current) return;

      const map = L.map(ref.current, { scrollWheelZoom: true });
      mapRef.current = map;

      // Free Esri World Imagery satellite tiles — no API key required.
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution:
            'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
        },
      ).addTo(map);
      // Place-name labels on top of the imagery.
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19, opacity: 0.9 },
      ).addTo(map);

      const withCoords = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

      if (withCoords.length === 0) {
        map.setView([39.5, -98.35], 4); // continental US
      } else {
        const bounds = L.latLngBounds(withCoords.map((p) => [p.lat, p.lng] as [number, number]));
        map.fitBounds(bounds.pad(0.25), { maxZoom: 12 });
      }

      for (const p of withCoords) {
        const color = MAP_STATUS_META[p.status].color;
        const marker = L.circleMarker([p.lat, p.lng], {
          radius: 9,
          color: '#ffffff',
          weight: 2,
          fillColor: color,
          fillOpacity: 0.95,
        }).addTo(map);
        marker.bindPopup(
          `<div style="min-width:160px">
             <div style="font-weight:700;font-size:14px;margin-bottom:2px">${escapeHtml(p.name)}</div>
             <div style="color:#667085;font-size:12px;margin-bottom:6px">${escapeHtml(p.sub)}</div>
             <div style="display:flex;align-items:center;gap:6px;font-size:12px;margin-bottom:8px">
               <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${color}"></span>
               ${MAP_STATUS_META[p.status].label} · ${p.permits} permit${p.permits === 1 ? '' : 's'}
             </div>
             <a href="/townships/${p.id}" style="color:#2563eb;font-weight:600;font-size:12px;text-decoration:none">Open township →</a>
           </div>`,
        );
      }
    })();

    return () => {
      cancelled = true;
      const m = mapRef.current as { remove?: () => void } | null;
      if (m && typeof m.remove === 'function') {
        m.remove();
        mapRef.current = null;
      }
    };
  }, [points]);

  return <div ref={ref} style={{ height: '100%', width: '100%', borderRadius: 12 }} />;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
}
