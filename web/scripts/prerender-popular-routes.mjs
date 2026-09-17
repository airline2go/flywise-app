// [POPULAR-ROUTES-SSG] Runs before `next build`, after stamp-assets.
// The homepage is served as a static file and needs real crawlable anchors in
// the initial HTML so route pages are discoverable without client-side JS.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const TOP_STRECKEN_COUNT = 30;

const PILL_STYLE =
  'background:var(--bg2);border:1px solid var(--bd);border-radius:20px;' +
  'padding:8px 16px;font-size:13px;font-weight:600;color:var(--tx);text-decoration:none';

// [GSC-TOP-ROUTES]
// Refreshed from the current Search Console page opportunity window through
// 2026-09-14, then supplemented with previously validated route pages so the
// homepage keeps a useful breadth of crawlable route links. The live build
// validation below is mandatory: stale entries that are no longer indexable or
// are redirect sources are dropped before anything is stamped into HTML.
export const GSC_ROUTES = [
  { slug: 'lgw-pmi', origin_city: 'London Gatwick', destination_city: 'Palma de Mallorca' },
  { slug: 'stuttgart-malaga', origin_city: 'Stuttgart', destination_city: 'Málaga' },
  { slug: 'frankfurt-ibiza', origin_city: 'Frankfurt', destination_city: 'Ibiza' },
  { slug: 'ibiza-duesseldorf', origin_city: 'Ibiza', destination_city: 'Düsseldorf' },
  { slug: 'duesseldorf-barcelona', origin_city: 'Düsseldorf', destination_city: 'Barcelona' },
  { slug: 'zrh-pmi', origin_city: 'Zürich', destination_city: 'Palma de Mallorca' },
  { slug: 'hamburg-duesseldorf', origin_city: 'Hamburg', destination_city: 'Düsseldorf' },
  { slug: 'frankfurt-fuerteventura', origin_city: 'Frankfurt', destination_city: 'Fuerteventura' },
  { slug: 'paris-zuerich', origin_city: 'Paris', destination_city: 'Zürich' },
  { slug: 'frankfurt-hamburg-3', origin_city: 'Frankfurt', destination_city: 'Hamburg' },
  { slug: 'dresden-stuttgart', origin_city: 'Dresden', destination_city: 'Stuttgart' },
  { slug: 'frankfurt-stuttgart-2', origin_city: 'Frankfurt', destination_city: 'Stuttgart' },
  { slug: 'hamburg-dresden', origin_city: 'Hamburg', destination_city: 'Dresden' },
  { slug: 'dublin-berlin', origin_city: 'Dublin', destination_city: 'Berlin' },
  { slug: 'pmi-mad', origin_city: 'Palma de Mallorca', destination_city: 'Madrid' },
  { slug: 'cologne-hamburg', origin_city: 'Cologne', destination_city: 'Hamburg' },
  { slug: 'duesseldorf-nuremberg', origin_city: 'Düsseldorf', destination_city: 'Nuremberg' },
  { slug: 'duesseldorf-berlin', origin_city: 'Düsseldorf', destination_city: 'Berlin' },
  { slug: 'zrh-mct', origin_city: 'Zürich', destination_city: 'Muscat' },
  { slug: 'jfk-zrh', origin_city: 'New York', destination_city: 'Zürich' },
  { slug: 'palma-de-mallorca-ibiza', origin_city: 'Palma de Mallorca', destination_city: 'Ibiza' },
  { slug: 'fuerteventura-cologne', origin_city: 'Fuerteventura', destination_city: 'Cologne' },
  { slug: 'xfw-mad', origin_city: 'Hamburg', destination_city: 'Madrid' },
  { slug: 'zuerich-dublin', origin_city: 'Zürich', destination_city: 'Dublin' },
  { slug: 'paris-madrid', origin_city: 'Paris', destination_city: 'Madrid' },
  { slug: 'hamburg-barcelona-2', origin_city: 'Hamburg', destination_city: 'Barcelona' },
  { slug: 'hannover-leipzig', origin_city: 'Hannover', destination_city: 'Leipzig' },
  { slug: 'hamburg-berlin', origin_city: 'Hamburg', destination_city: 'Berlin' },
  { slug: 'frankfurt-zuerich', origin_city: 'Frankfurt', destination_city: 'Zürich' },
  { slug: 'barcelona-amsterdam', origin_city: 'Barcelona', destination_city: 'Amsterdam' },
  { slug: 'copenhagen-berlin', origin_city: 'Copenhagen', destination_city: 'Berlin' },
  { slug: 'berlin-copenhagen', origin_city: 'Berlin', destination_city: 'Copenhagen' },
  { slug: 'tenerife-berlin', origin_city: 'Tenerife', destination_city: 'Berlin' },
  { slug: 'palma-de-mallorca-malaga', origin_city: 'Palma de Mallorca', destination_city: 'Málaga' },
  { slug: 'istanbul-london', origin_city: 'Istanbul', destination_city: 'London' },
  { slug: 'fuerteventura-alicante', origin_city: 'Fuerteventura', destination_city: 'Alicante' },
  { slug: 'dub-lgw', origin_city: 'Dublin', destination_city: 'London' },
  { slug: 'valencia-fuerteventura', origin_city: 'Valencia', destination_city: 'Fuerteventura' },
  { slug: 'london-amsterdam', origin_city: 'London', destination_city: 'Amsterdam' },
  { slug: 'madrid-ibiza', origin_city: 'Madrid', destination_city: 'Ibiza' },
  { slug: 'amsterdam-zuerich', origin_city: 'Amsterdam', destination_city: 'Zürich' },
  { slug: 'frankfurt-berlin', origin_city: 'Frankfurt', destination_city: 'Berlin' },
  { slug: 'palma-de-mallorca-duesseldorf', origin_city: 'Palma de Mallorca', destination_city: 'Düsseldorf' },
  { slug: 'cologne-palma-de-mallorca', origin_city: 'Cologne', destination_city: 'Palma de Mallorca' },
  { slug: 'duesseldorf-dresden', origin_city: 'Düsseldorf', destination_city: 'Dresden' },
  { slug: 'london-zuerich', origin_city: 'London', destination_city: 'Zürich' },
  { slug: 'alicante-ibiza', origin_city: 'Alicante', destination_city: 'Ibiza' },
  { slug: 'malaga-ibiza', origin_city: 'Málaga', destination_city: 'Ibiza' },
  { slug: 'palma-de-mallorca-stuttgart', origin_city: 'Palma de Mallorca', destination_city: 'Stuttgart' },
  { slug: 'alicante-fuerteventura', origin_city: 'Alicante', destination_city: 'Fuerteventura' },
];

export function filterValidRoutes(routes, validation) {
  const indexable = (validation && validation.indexableSlugs) || null;
  const redirects = (validation && validation.redirectSources) || new Set();
  if (!indexable) return routes;
  return routes.filter((r) => r && r.slug && indexable.has(r.slug) && !redirects.has(r.slug));
}

export function topStreckenRoutes(routes = GSC_ROUTES) {
  return routes.slice(0, TOP_STRECKEN_COUNT);
}

export function beliebteRoutes(routes = GSC_ROUTES) {
  return routes.slice(TOP_STRECKEN_COUNT);
}

export function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function encodeSlug(slug) {
  return encodeURIComponent(String(slug));
}

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

export function injectPopularLinks(html, linksHtml) {
  const divRe = /(<div id="popular-routes-links"[^>]*>)[\s\S]*?(<\/div>)/;
  if (!divRe.test(html)) throw new Error('#popular-routes-links container not found');
  let out = html.replace(divRe, `$1${linksHtml}$2`);
  out = out.replace(
    /<section id="popular-routes-links-section"[^>]*>/,
    linksHtml ? '<section id="popular-routes-links-section">' : '<section id="popular-routes-links-section" style="display:none">'
  );
  return out;
}

export function injectTopStrecken(html, cardsHtml) {
  const gridRe = /(<div[^>]*id="top-strecken-grid"[^>]*>)[\s\S]*?(<\/div>)/;
  if (!gridRe.test(html)) throw new Error('#top-strecken-grid container not found');
  return html.replace(gridRe, `$1${cardsHtml}$2`);
}

export function injectIntoHtml(html, routes = GSC_ROUTES) {
  let out = injectTopStrecken(html, buildTopCardsHtml(topStreckenRoutes(routes)));
  out = injectPopularLinks(out, buildLinksHtml(beliebteRoutes(routes)));
  return out;
}

async function fetchValidation() {
  const base = process.env.API_BASE || 'https://api.airpiv.com';
  try {
    const indexableSlugs = new Set();
    for (let page = 0; page < 10000; page++) {
      const res = await fetch(`${base}/route-pages?page=${page}`);
      if (!res.ok) throw new Error(`/route-pages ${res.status}`);
      const data = await res.json();
      for (const r of (data && data.routes) || []) {
        if (r && r.slug && r.indexable !== false) indexableSlugs.add(r.slug);
      }
      if (!data || !data.hasMore) break;
    }
    const redirectSources = new Set();
    try {
      const rr = await fetch(`${base}/route-redirects`);
      if (rr.ok) {
        const d = await rr.json();
        for (const r of (d && d.redirects) || []) {
          if (r && r.source_slug) redirectSources.add(r.source_slug);
        }
      }
    } catch {}
    return { indexableSlugs, redirectSources };
  } catch (e) {
    console.warn(`[prerender-popular-routes] validation fetch failed: ${e.message}`);
    return null;
  }
}

async function main() {
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
  const validation = await fetchValidation();
  if (!validation) {
    console.warn('[prerender-popular-routes] no validation data — leaving client-side fallback in place (no unvalidated links injected)');
    return;
  }
  const validRoutes = filterValidRoutes(GSC_ROUTES, validation);
  const dropped = GSC_ROUTES.length - validRoutes.length;
  if (!validRoutes.length) {
    console.warn('[prerender-popular-routes] no valid routes after validation — leaving client-side fallback in place');
    return;
  }
  const html = readFileSync(indexPath, 'utf8');
  const next = injectIntoHtml(html, validRoutes);
  writeFileSync(indexPath, next);
  console.log(
    `[prerender-popular-routes] injected ${topStreckenRoutes(validRoutes).length} Top-Strecken cards + ` +
      `${beliebteRoutes(validRoutes).length} Beliebte-Flugstrecken pills (validated; dropped ${dropped} invalid) into public/index.html`
  );
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((err) => {
    console.warn('[prerender-popular-routes] non-fatal error, skipping:', err && err.message);
    process.exit(0);
  });
}
