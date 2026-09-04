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

// [TEMPLATE-LASTMOD] A page's rendered SEO output — its <title>, meta
// description and on-page copy — is produced by shared TEMPLATES, not only by
// the entity's own row. When a template changes, the page a crawler sees
// genuinely changes even though the row's `updated_at` did not, so a purely
// data-derived <lastmod> would never move and Google would recrawl only on its
// slow default cadence (the exact gap that leaves a title/meta rewrite invisible
// in search for weeks). These per-type dates are the "this type's templates last
// materially changed" floor: buildXUrls() reports the LATER of a page's real
// data date and its type's template date (see applyTemplateFloor), giving an
// honest recrawl signal for template-driven changes.
//
// This is NOT the same-for-every-URL "always today" value toLastmod() guards
// against: each date is a FIXED past date that moves ONLY when a human bumps it
// here, and only for the type whose rendered output actually changed. Pages
// whose own data is newer keep their newer (more specific) date; only pages
// older than the template change floor up to it — which is truthful, because
// those pages really did all change on the deploy that shipped the new template.
//
//   Format: 'YYYY-MM-DD' (UTC), or null when a type has no template-driven
//   change to floor to. Bump a type's date ONLY when its rendered SEO output
//   actually changes, so <lastmod> stays meaningful to crawlers.
//   History:
//     routes 2026-08-02 — natural-language titles ("Flights from X to Y …"),
//                         "| Airpiv" brand suffix, and the data-gated live
//                         price in the meta description (SEO title/meta rewrite).
//     routes 2026-09-04 — airport-qualified titles for distinct-airport routes
//                         sharing one city-name title (P0-29 disambiguation),
//                         so each such title/H1/description is unique.
export const SEO_TEMPLATE_VERSIONS = {
  routes: '2026-09-04',
  cities: null,
  countries: null,
  airports: null,
  airlines: null,
  blog: null,
};

// Return the later (newer) of a page's real data lastmod and its type's template
// floor. Either may be null: the result is whichever exists, or null if neither
// does. Both are 'YYYY-MM-DD' strings, so a lexical compare is chronological.
export function applyTemplateFloor(dataLastmod, templateVersion) {
  if (!templateVersion) return dataLastmod || null;
  if (!dataLastmod) return templateVersion;
  return dataLastmod > templateVersion ? dataLastmod : templateVersion;
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

// Derive the airport sitemap set from the paginated /sitemap-data/routes feed.
// Each item is { o, d, lastmod } (both endpoints' IATA codes + the route's
// already-resolved lastmod). Returns Map(code -> newest 'YYYY-MM-DD' | null),
// in first-seen order. Same collapse as airportEntriesFromRoutes, but over the
// COMPLETE (unbounded) route set rather than a 1000-row page.
export function airportLastmods(routeItems) {
  const byCode = new Map();
  for (const r of routeItems) {
    const d = r.lastmod || null;
    for (const code of [r.o, r.d]) {
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

// ─── [SHARDING] Google's hard per-sitemap limits ──────────────────────────
// A single sitemap may list at most 50,000 URLs and weigh at most 50 MB
// uncompressed. A file that grows past either MUST be split, or Google drops
// the whole file. chunkUrls() enforces both so the architecture scales to
// hundreds of thousands of URLs with no future code change — a type that
// outgrows one file simply yields more shards, which the index enumerates.
export const MAX_URLS_PER_SITEMAP = 50000;
export const MAX_SITEMAP_BYTES = 50 * 1024 * 1024; // 50 MB

// The one canonical origin every sitemap URL must use (see validateSitemapUrls).
export const SITE_ORIGIN = 'https://airpiv.com';

// Child-sitemap URL for a type's Nth shard (1-based). Shard 1 keeps the flat,
// Search-Console-stable /sitemap-<type>.xml name; overflow shards live under
// /sitemap-shard/<type>-<n>.xml (Next can't mount a partially-dynamic segment
// at the root, and the root already owns a [lang] dynamic segment). Pure so the
// index builder and the validation tests agree on one naming scheme.
export function shardLoc(type, n) {
  return n === 1 ? `${SITE_ORIGIN}/sitemap-${type}.xml` : `${SITE_ORIGIN}/sitemap-shard/${type}-${n}.xml`;
}

// The fixed set of public static marketing/legal pages — the one place this
// list lives (no DB rows back them). Each returns 200, is self-canonical and
// indexable. Add a public static page by adding it here. No <lastmod>: these
// change rarely and carry no tracked timestamp (an unknown date omits <lastmod>
// rather than faking "today").
export const STATIC_PAGES = ['', 'cheap-flights.html', 'last-minute-flights.html', 'about.html', 'blog.html', 'contact.html', 'privacy.html', 'terms.html', 'refund-policy.html', 'cookies.html'];

export function pageUrls() {
  return STATIC_PAGES.map((p) => ({ loc: `${SITE_ORIGIN}/${p}`, lastmod: null }));
}

// Serialized byte size of one <url> block (its exact urlsetXml() rendering),
// used for the byte budget. UTF-8 aware so multi-byte locs are counted truly.
function entryBytes(u) {
  const loc = typeof u === 'string' ? u : u.loc;
  const lastmod = typeof u === 'string' ? null : u.lastmod;
  const lastmodLine = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
  const block = `  <url>\n    <loc>${loc}</loc>${lastmodLine}\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  return Buffer.byteLength(block, 'utf8');
}

// Fixed <?xml?> + <urlset> open/close overhead, counted against the byte budget.
const URLSET_OVERHEAD_BYTES = Buffer.byteLength(
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n</urlset>\n',
  'utf8',
);

// Split a URL list into shards, each within BOTH limits. Empty input yields no
// shards (so the index references nothing for an empty type — no orphan file).
export function chunkUrls(urls, maxUrls = MAX_URLS_PER_SITEMAP, maxBytes = MAX_SITEMAP_BYTES) {
  const chunks = [];
  let cur = [];
  let curBytes = URLSET_OVERHEAD_BYTES;
  for (const u of urls) {
    const b = entryBytes(u);
    if (cur.length > 0 && (cur.length >= maxUrls || curBytes + b > maxBytes)) {
      chunks.push(cur);
      cur = [];
      curBytes = URLSET_OVERHEAD_BYTES;
    }
    cur.push(u);
    curBytes += b;
  }
  if (cur.length > 0) chunks.push(cur);
  return chunks;
}

// Newest lastmod among a shard's entries (or null) — the child sitemap's own
// <lastmod> in the index, so the index reflects real content freshness.
export function chunkLastmod(urls) {
  let max = null;
  for (const u of urls) {
    const lastmod = typeof u === 'string' ? null : u.lastmod;
    if (lastmod && (!max || lastmod > max)) max = lastmod;
  }
  return max;
}

// Serialize a <sitemapindex> referencing child sitemaps. Each entry is
// { loc, lastmod? }; <lastmod> is emitted only when known.
export function sitemapIndexXml(entries) {
  const body = entries
    .map((e) => {
      const lastmodLine = e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : '';
      return `  <sitemap>\n    <loc>${e.loc}</loc>${lastmodLine}\n  </sitemap>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

// ─── [VALIDATION] Guards every sitemap must satisfy (see the SEO spec) ─────
// Returns an array of human-readable problems (empty = valid). A sitemap URL
// must be an https://airpiv.com canonical with no www/api host, no query
// string, and appear at most once. Used by the automated tests; safe to call
// at build/dev time too.
export function validateSitemapUrls(urls) {
  const problems = [];
  const seen = new Set();
  for (const u of urls) {
    const loc = typeof u === 'string' ? u : u.loc;
    if (!loc) { problems.push('empty <loc>'); continue; }
    if (!loc.startsWith(SITE_ORIGIN + '/') && loc !== SITE_ORIGIN + '/') {
      problems.push(`non-canonical host or scheme: ${loc}`);
    }
    if (/^http:\/\//i.test(loc)) problems.push(`insecure http:// URL: ${loc}`);
    if (/\/\/www\./i.test(loc)) problems.push(`www. host: ${loc}`);
    if (/\/\/api\./i.test(loc)) problems.push(`api. subdomain: ${loc}`);
    if (loc.includes('?')) problems.push(`parameter URL: ${loc}`);
    if (seen.has(loc)) problems.push(`duplicate URL: ${loc}`);
    seen.add(loc);
  }
  return problems;
}
