// [POPULAR-ROUTES-SSG] Runs before `next build`, after stamp-assets.
//
// The homepage (public/index.html) is served verbatim as a static file (see
// next.config.mjs [VERBATIM-HOME]). Its "Top Strecken" grid is filled by
// app.js with <div data-fn="qsHome"> search chips — NOT <a href> links — and
// the dedicated #popular-routes-links section was previously populated only
// at runtime by popular-routes.js (client-side fetch + innerHTML). Both mean
// the homepage's internal links to /flights/* route pages are INVISIBLE in
// the raw HTML source that Googlebot parses first — so those route pages are
// discoverable only via the sitemap, not from the homepage itself.
//
// This stamps real, crawlable <a href="/flights/slug"> anchors for the top
// routes directly into the static HTML at deploy time, and unhides the
// section, so the links are present on first byte for crawlers, no-JS clients,
// and link previews — matching how the /flights/* route pages already
// server-render their "similar routes" links.
//
// Deliberately defensive (same contract as stamp-assets.mjs): any problem here
// logs a warning and exits 0 so it can never break a deployment. On failure the
// section stays hidden+empty in the shipped HTML and the existing client-side
// popular-routes.js fallback still populates it at runtime.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Same inline style popular-routes.js uses for its runtime-injected anchors,
// so server-rendered and (fallback) client-rendered links look identical.
const ANCHOR_STYLE =
  'background:var(--bg2);border:1px solid var(--bd);border-radius:20px;' +
  'padding:8px 16px;font-size:13px;font-weight:600;color:var(--tx);text-decoration:none';

// [GSC-TOP-ROUTES] The homepage internal-link set, ordered by Google Search
// Console OPPORTUNITY — the exact ranking the admin "فرص السيو (Search Console)"
// report uses (lib/seo/report.js): category priority
// BREAKOUT → VERY_HIGH → HIGH → NORMAL → LOW, then impressions desc.
//
// Snapshot: GSC "Pages" export, 713 rows, 2026-08-08 — 0 BREAKOUT, 5 VERY_HIGH,
// 19 HIGH, then the single highest-impression NORMAL row (amsterdam-zuerich, 195
// impressions) fills slot 25.
//
// Why hardcoded rather than fetched: the GSC export lives only in the operator's
// browser (localStorage). There is no server-side copy the build can read — the
// seo_gsc_snapshots table is empty and no live GSC feed is connected — so the
// approved ranking is baked in here. All 25 were verified published + indexable
// via /route-pages/:slug when this list was authored. Refresh from a newer GSC
// export when the opportunity picture changes.
export const GSC_TOP_ROUTES = [
  { slug: 'hamburg-barcelona-2', origin_city: 'Hamburg', destination_city: 'Barcelona' },        // VERY_HIGH · 130
  { slug: 'hannover-leipzig', origin_city: 'Hannover', destination_city: 'Leipzig' },            // VERY_HIGH · 97
  { slug: 'ibiza-frankfurt', origin_city: 'Ibiza', destination_city: 'Frankfurt' },              // VERY_HIGH · 80
  { slug: 'jfk-lax', origin_city: 'New York', destination_city: 'Los Angeles' },                 // VERY_HIGH · 58
  { slug: 'hamburg-berlin', origin_city: 'Hamburg', destination_city: 'Berlin' },                // VERY_HIGH · 47
  { slug: 'barcelona-palma-de-mallorca', origin_city: 'Barcelona', destination_city: 'Palma de Mallorca' }, // HIGH · 56
  { slug: 'berlin-copenhagen', origin_city: 'Berlin', destination_city: 'Copenhagen' },          // HIGH · 39
  { slug: 'copenhagen-berlin', origin_city: 'Copenhagen', destination_city: 'Berlin' },          // HIGH · 36
  { slug: 'frankfurt-zuerich', origin_city: 'Frankfurt', destination_city: 'Zürich' },           // HIGH · 34
  { slug: 'barcelona-amsterdam', origin_city: 'Barcelona', destination_city: 'Amsterdam' },      // HIGH · 31
  { slug: 'palma-de-mallorca-malaga', origin_city: 'Palma de Mallorca', destination_city: 'Málaga' }, // HIGH · 29
  { slug: 'tenerife-berlin', origin_city: 'Tenerife', destination_city: 'Berlin' },              // HIGH · 27
  { slug: 'heringsdorf-leipzig', origin_city: 'Heringsdorf', destination_city: 'Leipzig' },      // HIGH · 26
  { slug: 'xfw-lgw', origin_city: 'Hamburg', destination_city: 'London' },                       // HIGH · 24
  { slug: 'fuerteventura-alicante', origin_city: 'Fuerteventura', destination_city: 'Alicante' },// HIGH · 24
  { slug: 'istanbul-london', origin_city: 'Istanbul', destination_city: 'London' },              // HIGH · 23
  { slug: 'madrid-ibiza', origin_city: 'Madrid', destination_city: 'Ibiza' },                    // HIGH · 22
  { slug: 'dub-lgw', origin_city: 'Dublin', destination_city: 'London' },                        // HIGH · 22
  { slug: 'valencia-fuerteventura', origin_city: 'Valencia', destination_city: 'Fuerteventura' },// HIGH · 22
  { slug: 'berlin-stuttgart', origin_city: 'Berlin', destination_city: 'Stuttgart' },            // HIGH · 21
  { slug: 'london-amsterdam', origin_city: 'London', destination_city: 'Amsterdam' },            // HIGH · 21
  { slug: 'dublin-london', origin_city: 'Dublin', destination_city: 'London' },                  // HIGH · 20
  { slug: 'frankfurt-stockholm', origin_city: 'Frankfurt', destination_city: 'Stockholm' },      // HIGH · 20
  { slug: 'jfk-ber', origin_city: 'New York', destination_city: 'Berlin' },                      // HIGH · 20
  { slug: 'amsterdam-zuerich', origin_city: 'Amsterdam', destination_city: 'Zürich' },           // NORMAL · 195
];

export function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// URL-path segment encoding for the slug (mirrors encodeURIComponent in
// popular-routes.js) — slugs are ASCII kebab-case today, but stay safe.
function encodeSlug(slug) {
  return encodeURIComponent(String(slug));
}

export function buildLinksHtml(routes) {
  return routes
    .map(
      (r) =>
        `<a href="/flights/${encodeSlug(r.slug)}" style="${ANCHOR_STYLE}">` +
        `${escHtml(r.origin_city)} → ${escHtml(r.destination_city)}` +
        '</a>'
    )
    .join('');
}

export function injectIntoHtml(html, linksHtml) {
  // Replace the inner content of #popular-routes-links (the container holds
  // only <a> anchors — no nested elements — so a non-greedy match to the next
  // </div> is exact and idempotent across re-runs).
  const divRe = /(<div id="popular-routes-links"[^>]*>)[\s\S]*?(<\/div>)/;
  if (!divRe.test(html)) throw new Error('#popular-routes-links container not found');
  let out = html.replace(divRe, `$1${linksHtml}$2`);

  // Unhide the section (drop the inline display:none). Idempotent: matches the
  // section tag with or without a style attribute and rewrites to a bare tag.
  out = out.replace(
    /<section id="popular-routes-links-section"[^>]*>/,
    '<section id="popular-routes-links-section">'
  );
  return out;
}

function main() {
  const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
  const indexPath = join(publicDir, 'index.html');

  if (!existsSync(indexPath)) {
    console.warn('[prerender-popular-routes] public/index.html not found — skipping');
    return;
  }

  if (!GSC_TOP_ROUTES.length) {
    console.warn('[prerender-popular-routes] no routes configured — leaving client-side fallback in place');
    return;
  }

  const html = readFileSync(indexPath, 'utf8');
  const next = injectIntoHtml(html, buildLinksHtml(GSC_TOP_ROUTES));
  writeFileSync(indexPath, next);
  console.log(`[prerender-popular-routes] injected ${GSC_TOP_ROUTES.length} crawlable route links (GSC opportunity order) into public/index.html`);
}

// Only run the build step when executed directly (`node prerender-popular-routes.mjs`),
// not when imported by the test suite — importing must have no side effects.
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  try {
    main();
  } catch (err) {
    console.warn('[prerender-popular-routes] non-fatal error, skipping:', err && err.message);
    process.exit(0);
  }
}
