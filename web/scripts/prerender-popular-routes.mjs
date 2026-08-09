// [POPULAR-ROUTES-SSG] Runs before `next build`, after stamp-assets.
//
// The homepage (public/index.html) is served verbatim as a static file (see
// next.config.mjs [VERBATIM-HOME]). It shows the top routes in TWO places:
//
//   1. "Top Strecken"  → #top-strecken-grid  (the prominent card grid)
//   2. "Beliebte Flugstrecken" → #popular-routes-links  (the pill list below)
//
// Both were previously filled at runtime by JavaScript (app.js rendered the
// Top-Strecken cards as <div data-fn="qsHome"> search chips — NOT links — and
// popular-routes.js fetched the pill list). That means the homepage's internal
// links to /flights/* route pages were INVISIBLE in the raw HTML source that
// Googlebot parses first, so those route pages were discoverable only via the
// sitemap, not from the homepage itself.
//
// This stamps real, crawlable <a href="/flights/slug"> anchors for the top
// routes directly into the static HTML at deploy time — the highest-opportunity
// 30 as Top-Strecken cards, the next block as the Beliebte-Flugstrecken pills —
// and unhides the pill section, so the links are present on first byte for
// crawlers, no-JS clients, and link previews. Matches how the /flights/* route
// pages already server-render their "similar routes" links.
//
// Deliberately defensive (same contract as stamp-assets.mjs): any problem here
// logs a warning and exits 0 so it can never break a deployment. On failure the
// Top-Strecken grid stays empty (app.js no longer fills it) and the pill section
// stays hidden — the existing client-side popular-routes.js fallback still
// populates the pills at runtime.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// How many of the ranked routes go into the prominent "Top Strecken" card grid.
// The remainder fill the "Beliebte Flugstrecken" pill list below it.
export const TOP_STRECKEN_COUNT = 30;

// Pill style for #popular-routes-links — same inline style popular-routes.js
// uses for its runtime-injected fallback anchors, so server-rendered and
// (fallback) client-rendered links look identical.
const PILL_STYLE =
  'background:var(--bg2);border:1px solid var(--bd);border-radius:20px;' +
  'padding:8px 16px;font-size:13px;font-weight:600;color:var(--tx);text-decoration:none';

// [GSC-TOP-ROUTES] The homepage internal-link set, ordered by Google Search
// Console OPPORTUNITY — the exact ranking the admin "فرص السيو (Search Console)"
// report uses (lib/seo/report.js): category priority
// BREAKOUT → VERY_HIGH → HIGH → NORMAL → LOW, then impressions desc.
//
// Snapshot: GSC "Pages" export, 652 rows, 2026-08-09 — 0 BREAKOUT, 6 VERY_HIGH,
// 13 HIGH, then NORMAL by impressions desc. The first 30 become Top-Strecken
// cards; the rest become Beliebte-Flugstrecken pills.
//
// Why hardcoded rather than fetched: the GSC export lives only in the operator's
// browser (localStorage). There is no server-side copy the build can read — the
// seo_gsc_snapshots table is empty and no live GSC feed is connected — so the
// approved ranking is baked in here. All entries were verified published +
// indexable via route_pages when this list was authored. Refresh from a newer
// GSC export when the opportunity picture changes.
export const GSC_ROUTES = [
  // ── Top Strecken (ranks 1–30) ──────────────────────────────────────────
  { slug: 'hamburg-barcelona-2', origin_city: 'Hamburg', destination_city: 'Barcelona' },        // VERY_HIGH · 109
  { slug: 'hannover-leipzig', origin_city: 'Hannover', destination_city: 'Leipzig' },            // VERY_HIGH · 94
  { slug: 'ibiza-frankfurt', origin_city: 'Ibiza', destination_city: 'Frankfurt' },              // VERY_HIGH · 74
  { slug: 'jfk-lax', origin_city: 'New York', destination_city: 'Los Angeles' },                 // VERY_HIGH · 51
  { slug: 'barcelona-palma-de-mallorca', origin_city: 'Barcelona', destination_city: 'Palma de Mallorca' }, // VERY_HIGH · 51
  { slug: 'hamburg-berlin', origin_city: 'Hamburg', destination_city: 'Berlin' },                // VERY_HIGH · 43
  { slug: 'copenhagen-berlin', origin_city: 'Copenhagen', destination_city: 'Berlin' },          // HIGH · 34
  { slug: 'berlin-copenhagen', origin_city: 'Berlin', destination_city: 'Copenhagen' },          // HIGH · 30
  { slug: 'frankfurt-zuerich', origin_city: 'Frankfurt', destination_city: 'Zürich' },           // HIGH · 28
  { slug: 'barcelona-amsterdam', origin_city: 'Barcelona', destination_city: 'Amsterdam' },      // HIGH · 28
  { slug: 'tenerife-berlin', origin_city: 'Tenerife', destination_city: 'Berlin' },              // HIGH · 26
  { slug: 'heringsdorf-leipzig', origin_city: 'Heringsdorf', destination_city: 'Leipzig' },      // HIGH · 26
  { slug: 'palma-de-mallorca-malaga', origin_city: 'Palma de Mallorca', destination_city: 'Málaga' }, // HIGH · 26
  { slug: 'istanbul-london', origin_city: 'Istanbul', destination_city: 'London' },              // HIGH · 23
  { slug: 'fuerteventura-alicante', origin_city: 'Fuerteventura', destination_city: 'Alicante' },// HIGH · 23
  { slug: 'dub-lgw', origin_city: 'Dublin', destination_city: 'London' },                        // HIGH · 22
  { slug: 'valencia-fuerteventura', origin_city: 'Valencia', destination_city: 'Fuerteventura' },// HIGH · 22
  { slug: 'london-amsterdam', origin_city: 'London', destination_city: 'Amsterdam' },            // HIGH · 21
  { slug: 'madrid-ibiza', origin_city: 'Madrid', destination_city: 'Ibiza' },                    // HIGH · 20
  { slug: 'amsterdam-zuerich', origin_city: 'Amsterdam', destination_city: 'Zürich' },           // NORMAL · 184
  { slug: 'frankfurt-berlin', origin_city: 'Frankfurt', destination_city: 'Berlin' },            // NORMAL · 182
  { slug: 'palma-de-mallorca-duesseldorf', origin_city: 'Palma de Mallorca', destination_city: 'Düsseldorf' }, // NORMAL · 148
  { slug: 'cologne-palma-de-mallorca', origin_city: 'Cologne', destination_city: 'Palma de Mallorca' }, // NORMAL · 128
  { slug: 'duesseldorf-dresden', origin_city: 'Düsseldorf', destination_city: 'Dresden' },       // NORMAL · 125
  { slug: 'london-zuerich', origin_city: 'London', destination_city: 'Zürich' },                 // NORMAL · 125
  { slug: 'alicante-ibiza', origin_city: 'Alicante', destination_city: 'Ibiza' },                // NORMAL · 117
  { slug: 'frankfurt-ibiza', origin_city: 'Frankfurt', destination_city: 'Ibiza' },              // NORMAL · 112
  { slug: 'malaga-ibiza', origin_city: 'Málaga', destination_city: 'Ibiza' },                    // NORMAL · 109
  { slug: 'palma-de-mallorca-stuttgart', origin_city: 'Palma de Mallorca', destination_city: 'Stuttgart' }, // NORMAL · 92
  { slug: 'alicante-fuerteventura', origin_city: 'Alicante', destination_city: 'Fuerteventura' },// NORMAL · 91
  // ── Beliebte Flugstrecken (ranks 31+) ──────────────────────────────────
  { slug: 'hamburg-duesseldorf', origin_city: 'Hamburg', destination_city: 'Düsseldorf' },       // NORMAL · 91
  { slug: 'alicante-malaga', origin_city: 'Alicante', destination_city: 'Málaga' },              // NORMAL · 89
  { slug: 'palma-de-mallorca-hamburg', origin_city: 'Palma de Mallorca', destination_city: 'Hamburg' }, // NORMAL · 82
  { slug: 'barcelona-zuerich', origin_city: 'Barcelona', destination_city: 'Zürich' },           // NORMAL · 80
  { slug: 'palma-de-mallorca-ibiza', origin_city: 'Palma de Mallorca', destination_city: 'Ibiza' }, // NORMAL · 75
  { slug: 'palma-de-mallorca-valencia', origin_city: 'Palma de Mallorca', destination_city: 'Valencia' }, // NORMAL · 70
  { slug: 'barcelona-madrid', origin_city: 'Barcelona', destination_city: 'Madrid' },            // NORMAL · 68
  { slug: 'munich-cologne', origin_city: 'Munich', destination_city: 'Cologne' },                // NORMAL · 66
  { slug: 'palma-de-mallorca-berlin', origin_city: 'Palma de Mallorca', destination_city: 'Berlin' }, // NORMAL · 57
  { slug: 'alicante-berlin', origin_city: 'Alicante', destination_city: 'Berlin' },              // NORMAL · 55
  { slug: 'cologne-hamburg', origin_city: 'Cologne', destination_city: 'Hamburg' },              // NORMAL · 54
  { slug: 'madrid-munich-2', origin_city: 'Madrid', destination_city: 'Munich' },                // NORMAL · 53
  { slug: 'frankfurt-fuerteventura', origin_city: 'Frankfurt', destination_city: 'Fuerteventura' }, // NORMAL · 51
  { slug: 'ibiza-duesseldorf', origin_city: 'Ibiza', destination_city: 'Düsseldorf' },           // NORMAL · 47
  { slug: 'cologne-fuerteventura', origin_city: 'Cologne', destination_city: 'Fuerteventura' },  // NORMAL · 47
  { slug: 'malaga-munich', origin_city: 'Málaga', destination_city: 'Munich' },                  // NORMAL · 47
  { slug: 'duesseldorf-weeze', origin_city: 'Düsseldorf', destination_city: 'Weeze' },           // NORMAL · 43
  { slug: 'barcelona-paris', origin_city: 'Barcelona', destination_city: 'Paris' },              // NORMAL · 41
  { slug: 'dortmund-stuttgart', origin_city: 'Dortmund', destination_city: 'Stuttgart' },        // NORMAL · 41
  { slug: 'paris-zuerich', origin_city: 'Paris', destination_city: 'Zürich' },                   // NORMAL · 41
  { slug: 'stockholm-zuerich', origin_city: 'Stockholm', destination_city: 'Zürich' },           // NORMAL · 41
  { slug: 'alicante-barcelona', origin_city: 'Alicante', destination_city: 'Barcelona' },        // NORMAL · 40
  { slug: 'madrid-zuerich', origin_city: 'Madrid', destination_city: 'Zürich' },                 // NORMAL · 40
  { slug: 'ibiza-valencia', origin_city: 'Ibiza', destination_city: 'Valencia' },                // NORMAL · 40
  { slug: 'dublin-zuerich', origin_city: 'Dublin', destination_city: 'Zürich' },                 // NORMAL · 33
];

// The two ranked slices: the prominent card grid, then the pill list.
export function topStreckenRoutes() {
  return GSC_ROUTES.slice(0, TOP_STRECKEN_COUNT);
}
export function beliebteRoutes() {
  return GSC_ROUTES.slice(TOP_STRECKEN_COUNT);
}

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

// "Beliebte Flugstrecken" pills for #popular-routes-links. The container holds
// only <a> anchors (no nested elements) — see injectPopularLinks.
export function buildLinksHtml(routes) {
  return routes
    .map(
      (r) =>
        `<a href="/flights/${encodeSlug(r.slug)}" style="${PILL_STYLE}">` +
        `${escHtml(r.origin_city)} → ${escHtml(r.destination_city)}` +
        '</a>'
    )
    .join('');
}

// "Top Strecken" cards for #top-strecken-grid. Reuses the existing .rchip card
// styling; the label uses a <span> (never a nested <div>) so injectTopStrecken's
// match to the container's own </div> stays exact.
export function buildTopCardsHtml(routes) {
  return routes
    .map(
      (r) =>
        `<a class="rchip" href="/flights/${encodeSlug(r.slug)}" style="text-decoration:none">` +
        `<span class="rname">${escHtml(r.origin_city)} → ${escHtml(r.destination_city)}</span>` +
        '</a>'
    )
    .join('');
}

// Replace the inner content of #popular-routes-links (the pill container holds
// only <a> anchors — no nested elements — so a non-greedy match to the next
// </div> is exact and idempotent across re-runs), then unhide the section.
export function injectPopularLinks(html, linksHtml) {
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

// Replace the inner content of #top-strecken-grid. The card anchors contain only
// <span> children (no <div>), so a non-greedy match to the container's own
// </div> is exact and idempotent across re-runs.
export function injectTopStrecken(html, cardsHtml) {
  const gridRe = /(<div[^>]*id="top-strecken-grid"[^>]*>)[\s\S]*?(<\/div>)/;
  if (!gridRe.test(html)) throw new Error('#top-strecken-grid container not found');
  return html.replace(gridRe, `$1${cardsHtml}$2`);
}

// Apply both injections. Kept separate + composable so the tests can exercise
// each container independently.
export function injectIntoHtml(html) {
  let out = injectTopStrecken(html, buildTopCardsHtml(topStreckenRoutes()));
  out = injectPopularLinks(out, buildLinksHtml(beliebteRoutes()));
  return out;
}

function main() {
  const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
  const indexPath = join(publicDir, 'index.html');

  if (!existsSync(indexPath)) {
    console.warn('[prerender-popular-routes] public/index.html not found — skipping');
    return;
  }

  if (!GSC_ROUTES.length) {
    console.warn('[prerender-popular-routes] no routes configured — leaving client-side fallback in place');
    return;
  }

  const html = readFileSync(indexPath, 'utf8');
  const next = injectIntoHtml(html);
  writeFileSync(indexPath, next);
  console.log(
    `[prerender-popular-routes] injected ${topStreckenRoutes().length} Top-Strecken cards + ` +
      `${beliebteRoutes().length} Beliebte-Flugstrecken pills (GSC opportunity order) into public/index.html`
  );
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
