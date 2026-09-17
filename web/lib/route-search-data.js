const API_BASE = process.env.API_BASE || 'https://api.airpiv.com';
const REVALIDATE = 900;

// The route page renderer and the search hub do not need to share the same
// cached fetch entry. A stale/null content-api entry can otherwise suppress
// the hub even while the main route renderer still has valid route data.
export async function getRouteSearchData(slug) {
  if (!slug) return null;
  const encoded = encodeURIComponent(slug);
  try {
    const res = await fetch(`${API_BASE}/route-pages/${encoded}?surface=route-search`, {
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.route ? data.route : null;
  } catch {
    return null;
  }
}
