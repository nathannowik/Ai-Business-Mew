// Best-effort geocoding via OpenStreetMap Nominatim (no API key). Never throws — if the
// lookup fails or the host is blocked by the deployment's network policy, returns null and
// the user can set the map location by hand on the township form.

export async function geocode(parts: { name: string; county?: string | null; state?: string | null }): Promise<{ lat: number; lng: number } | null> {
  const query = [parts.name, parts.county && `${parts.county} County`, parts.state, 'USA']
    .filter(Boolean)
    .join(', ');
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Nominatim requires a descriptive User-Agent.
        'User-Agent': 'PermitPilot/1.0 (soliciting-permit management app)',
        Accept: 'application/json',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!Array.isArray(data) || data.length === 0) return null;
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}
