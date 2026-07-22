// [REAL-LASTMOD] Pure sitemap serialization + <lastmod> helpers, split out of
// sitemap-urls.js so they're unit-testable with `node --test` without pulling
// content-api (which imports react). Mirrors the pure/route-handler split that
// revalidate-paths.mjs already uses.

// Normalize a timestamp (ISO string / Date / null) to a sitemap `YYYY-MM-DD`
// date, or null when there's no usable value. A URL with no known date omits
// <lastmod> entirely rather than claiming it changed "today" — the whole point
// of this change is to stop emitting a same-for-every-URL, always-today date
// that trains crawlers to ignore lastmod.
export function toLastmod(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

// Freshness date for a route row: its last real change (content edit or the
// periodic route-intelligence refresh), falling back to creation.
export function routeLastmod(r) {
  return toLastmod(r.updated_at || r.insights_updated_at || r.created_at);
}

// Airports have no dedicated list endpoint; the distinct set is derived from
// the route_pages list (every row carries both endpoints' IATA codes), in
// first-seen order to match production. Each airport's <lastmod> is the newest
// date among the routes that touch it.
export function airportEntriesFromRoutes(routes) {
  const byCode = new Map(); // code -> newest 'YYYY-MM-DD' (or null)
  for (const r of routes) {
    const d = routeLastmod(r);
    for (const code of [r.origin_iata, r.destination_iata]) {
      if (!code) continue;
      if (!byCode.has(code)) byCode.set(code, d);
      else {
        const prev = byCode.get(code);
        if (d && (!prev || d > prev)) byCode.set(code, d);
      }
    }
  }
  return byCode;
}

// Serialize sitemap entries into a <urlset> document. Accepts either
// { loc, lastmod } objects or bare URL strings (back-compat). <lastmod> is
// emitted only when a real date is known; changefreq/priority are unchanged.
export function urlsetXml(urls) {
  const body = urls
    .map((u) => {
      const loc = typeof u === 'string' ? u : u.loc;
      const lastmod = typeof u === 'string' ? null : u.lastmod;
      const lastmodLine = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
      return `  <url>\n    <loc>${loc}</loc>${lastmodLine}\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}
