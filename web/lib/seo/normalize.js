'use strict';

// [GSC-NORMALIZE §7] The normalization layer between a raw GSC data source
// (export CSV/JSON, or a future Search Console API/OAuth feed) and the
// classifier. It maps whatever shape the source hands us onto ONE canonical row
// and aggregates the many per-query rows GSC emits for a single page into one
// per-URL row — so the classifier and report never depend on the source format.
//
//   raw GSC rows → normalizeGscRows() → canonical per-URL rows → classifier
//
// Canonical row:
//   { url, slug, pageType, language, primaryQuery, impressions, clicks, position, queries }
//
// [ALL-ENTITY-COVERAGE] Originally this recognized ONLY /flights/<slug> pages,
// silently dropping every city / airport / airline / country / blog / home row —
// so the opportunity report ignored most of the site's ranking pages (e.g. the
// Arabic /ar, /ar/city/*, /ar/airport/*, /ar/airline/* pages that already earn
// impressions). It now recognizes every entity page type Airpiv serves and tags
// each row with its `pageType`, while keeping the exact flights behaviour (and
// the `slug` field) unchanged so existing callers and tests are unaffected.
//
// Rules (never fabricate):
//   • impressions: summed across a URL's rows; unknown → null only if NO row had
//     a value, else the sum of the known ones.
//   • clicks: summed, but stays null when NO row carried a click value (unknown
//     ≠ zero — a CTR is then reported as n/a, never 0%).
//   • position: impression-weighted mean of the rows that have a position
//     (GSC's own aggregation model); falls back to a plain mean, else null.
//   • primaryQuery: the query of the highest-impression row (the term the page
//     actually ranks for), or null when the source carried no query column.
//   • pageType: derived from the URL path only; a URL that matches no known
//     entity shape is dropped (never guessed).
//   • malformed/empty input never throws — it yields [].

const DEFAULT_LANGUAGE = 'de'; // unprefixed root URLs are German on this platform

// The seven non-default languages that live under a /xx/ prefix (German is the
// unprefixed root). Kept in sync with lib/legacy-render/serve.js PREFIXED_LANGS.
const PREFIXED_LANGS = new Set(['en', 'ar', 'es', 'fr', 'it', 'nl', 'tr']);

// Entity page shapes Airpiv serves, matched against the path AFTER the optional
// /xx language prefix has been stripped. Order does not matter — the paths are
// mutually exclusive. The capture group is the entity key (route slug, city
// slug, IATA airport/airline code, country code, blog slug).
const ENTITY_PATTERNS = [
  { type: 'flight-route', re: /^\/flights\/([^/]+)$/ },
  { type: 'city', re: /^\/city\/([^/]+)$/ },
  { type: 'airport', re: /^\/airport\/([^/]+)$/ },
  { type: 'airline', re: /^\/airline\/([^/]+)$/ },
  { type: 'country', re: /^\/country\/([^/]+)$/ },
  { type: 'blog', re: /^\/blog\/([^/]+)$/ },
];

// Pull a numeric field trying several likely GSC key spellings; returns null
// when absent/blank, NaN-safe.
function num(obj, keys) {
  for (const k of keys) {
    if (obj[k] === undefined || obj[k] === null || obj[k] === '') continue;
    const n = Number(obj[k]);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function str(obj, keys) {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

// A URL (with or without host, query, trailing slash) → its path, or '' when it
// cannot be parsed. Shared by every path-based helper below.
function pathOf(url) {
  if (!url) return '';
  let path = String(url);
  try {
    if (/^https?:\/\//i.test(path)) path = new URL(path).pathname;
  } catch { /* not a full URL — treat as a path */ }
  return path.split('?')[0].split('#')[0].replace(/\/+$/, '');
}

// Strip a leading /xx language prefix from a path, returning
// { language, rest } where `rest` starts with '/' (or is '' for a bare prefix).
// An unprefixed path is German (the platform default).
function splitLanguage(path) {
  const m = path.match(/^\/([a-z]{2})(\/.*|)$/);
  if (m && PREFIXED_LANGS.has(m[1])) return { language: m[1], rest: m[2] || '' };
  return { language: DEFAULT_LANGUAGE, rest: path };
}

// [BACKWARD-COMPAT] /flights/<slug> (with or without host, query, trailing
// slash, or language prefix) → slug. Anything that isn't a recognizable flights
// URL returns null. Unchanged public contract — kept for existing callers.
function slugFromUrl(url) {
  const entity = entityFromUrl(url);
  return entity && entity.type === 'flight-route' ? entity.key : null;
}

// The entity type + key a URL addresses, or null when it is not a recognizable
// Airpiv entity page (dropped as junk). A bare root or bare language prefix
// (`/`, `/ar`) is the localized home page.
function entityFromUrl(url) {
  const { rest } = splitLanguage(pathOf(url));
  if (rest === '' || rest === '/') return { type: 'home', key: 'home' };
  for (const { type, re } of ENTITY_PATTERNS) {
    const m = rest.match(re);
    if (m) return { type, key: decodeURIComponent(m[1]) };
  }
  return null;
}

// Language from a URL prefix: /en/flights/… → 'en'; /ar → 'ar'; unprefixed → 'de'.
function languageFromUrl(url) {
  return splitLanguage(pathOf(url)).language;
}

// One raw row → a shallow canonical view (not yet aggregated). Returns null for
// a row whose URL is not a recognizable Airpiv entity page.
function normalizeGscRow(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const url = str(raw, ['url', 'page', 'Page', 'link', 'address']);
  const explicitSlug = str(raw, ['slug']);
  const entity = url ? entityFromUrl(url) : null;
  // A row is usable only when it resolves to a known entity page. An explicit
  // `slug` field with no URL is treated as a flights slug (the legacy shape some
  // callers pass), preserving prior behaviour for slug-only rows.
  const pageType = entity ? entity.type : (explicitSlug ? 'flight-route' : null);
  const key = entity ? entity.key : explicitSlug;
  if (!pageType || !key) return null;
  return {
    url: url || `/flights/${key}`,
    slug: key,
    pageType,
    language: str(raw, ['language', 'lang']) || (url ? languageFromUrl(url) : DEFAULT_LANGUAGE),
    primaryQuery: str(raw, ['query', 'Query', 'keyword', 'search_term', 'primaryQuery']),
    impressions: num(raw, ['impressions', 'Impressions']),
    clicks: num(raw, ['clicks', 'Clicks']),
    position: num(raw, ['position', 'Position', 'avg_position', 'average_position']),
  };
}

// Aggregate a URL's rows into one canonical per-URL row (GSC-style).
function aggregate(rows) {
  let impSum = 0;
  let impKnown = false;
  let clickSum = 0;
  let clickKnown = false;
  let posWeightedNum = 0;
  let posWeight = 0;
  let posPlainSum = 0;
  let posPlainCount = 0;
  let best = null; // highest-impression row → primaryQuery + language

  for (const r of rows) {
    if (r.impressions != null) { impSum += r.impressions; impKnown = true; }
    if (r.clicks != null) { clickSum += r.clicks; clickKnown = true; }
    if (r.position != null) {
      posPlainSum += r.position;
      posPlainCount += 1;
      const w = r.impressions != null && r.impressions > 0 ? r.impressions : 0;
      posWeightedNum += r.position * w;
      posWeight += w;
    }
    const rImp = r.impressions || 0;
    if (!best || rImp > (best.impressions || 0)) best = r;
  }

  const position = posWeight > 0 ? posWeightedNum / posWeight
    : posPlainCount > 0 ? posPlainSum / posPlainCount
      : null;

  return {
    url: best.url,
    slug: best.slug || null,
    pageType: best.pageType || null,
    language: best.language || DEFAULT_LANGUAGE,
    primaryQuery: best.primaryQuery || null,
    impressions: impKnown ? impSum : null,
    clicks: clickKnown ? clickSum : null,
    position: position == null ? null : Math.round(position * 100) / 100,
    queries: rows.filter((r) => r.primaryQuery).length,
  };
}

// Normalize + de-duplicate a whole raw export. Rows for the same page (the many
// per-query rows GSC emits) collapse into one aggregated per-URL row. The
// grouping key is scoped by page type so a route slug and a same-named entity
// code can never merge into one row.
function normalizeGscRows(rawRows) {
  if (!Array.isArray(rawRows)) return [];
  const byKey = new Map();
  for (const raw of rawRows) {
    const row = normalizeGscRow(raw);
    if (!row) continue;
    const key = `${row.pageType}:${row.slug || row.url}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(row);
  }
  return [...byKey.values()].map(aggregate);
}

module.exports = { normalizeGscRow, normalizeGscRows, slugFromUrl, languageFromUrl, entityFromUrl };
