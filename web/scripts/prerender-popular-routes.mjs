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
// published routes directly into the static HTML at deploy time, and unhides
// the section, so the links are present on first byte for crawlers, no-JS
// clients, and link previews — matching how the /flights/* route pages
// already server-render their "similar routes" links.
//
// Deliberately defensive (same contract as stamp-assets.mjs): any problem
// here logs a warning and exits 0 so it can never break a deployment. On
// failure the section stays hidden+empty in the shipped HTML and the existing
// client-side popular-routes.js fallback still populates it at runtime —
// exactly today's behavior.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const API_BASE = process.env.API_BASE || 'https://api.airpiv.com';
const ROUTE_LIMIT = 24;
// Same inline style popular-routes.js uses for its runtime-injected anchors,
// so server-rendered and (fallback) client-rendered links look identical.
const ANCHOR_STYLE =
  'background:var(--bg2);border:1px solid var(--bd);border-radius:20px;' +
  'padding:8px 16px;font-size:13px;font-weight:600;color:var(--tx);text-decoration:none';

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

async function fetchTopRoutes() {
  const res = await fetch(`${API_BASE}/route-pages`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for /route-pages`);
  const json = await res.json();
  if (!json || !json.ok || !Array.isArray(json.routes)) throw new Error('unexpected /route-pages shape');

  return json.routes
    // Never link to routes flagged non-indexable — those pages are noindex.
    .filter((r) => r && r.slug && r.origin_city && r.destination_city && r.indexable !== false)
    // Best routes first, not newest. The API's default order floats unscored
    // routes (route_score = null) to the top, so sort by score descending with
    // null scores last — same ranking popular-routes.js applies client-side.
    .sort((a, b) => {
      const sa = a.route_score == null ? -Infinity : a.route_score;
      const sb = b.route_score == null ? -Infinity : b.route_score;
      return sb - sa;
    })
    .slice(0, ROUTE_LIMIT);
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

async function main() {
  const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
  const indexPath = join(publicDir, 'index.html');

  if (!existsSync(indexPath)) {
    console.warn('[prerender-popular-routes] public/index.html not found — skipping');
    return;
  }

  const routes = await fetchTopRoutes();
  if (!routes.length) {
    console.warn('[prerender-popular-routes] no indexable routes returned — leaving client-side fallback in place');
    return;
  }

  const html = readFileSync(indexPath, 'utf8');
  const next = injectIntoHtml(html, buildLinksHtml(routes));
  writeFileSync(indexPath, next);
  console.log(`[prerender-popular-routes] injected ${routes.length} crawlable route links into public/index.html`);
}

// Only run the build step when executed directly (`node prerender-popular-routes.mjs`),
// not when imported by the test suite — importing must have no side effects.
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((err) => {
    console.warn('[prerender-popular-routes] non-fatal error, skipping:', err && err.message);
    process.exit(0);
  });
}
