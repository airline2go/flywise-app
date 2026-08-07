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
//   { url, slug, language, primaryQuery, impressions, clicks, position, queries }
//
// Rules (never fabricate):
//   • impressions: summed across a URL's rows; unknown → 0 only if NO row had a
//     value, else the sum of the known ones.
//   • clicks: summed, but stays null when NO row carried a click value (unknown
//     ≠ zero — a CTR is then reported as n/a, never 0%).
//   • position: impression-weighted mean of the rows that have a position
//     (GSC's own aggregation model); falls back to a plain mean, else null.
//   • primaryQuery: the query of the highest-impression row (the term the page
//     actually ranks for), or null when the source carried no query column.
//   • malformed/empty input never throws — it yields [].

const DEFAULT_LANGUAGE = 'de'; // unprefixed root URLs are German on this platform

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

// /flights/<slug> (with or without host, query, trailing slash) → slug.
// Anything that isn't a recognizable flights URL returns null.
function slugFromUrl(url) {
  if (!url) return null;
  let path = String(url);
  try {
    if (/^https?:\/\//i.test(path)) path = new URL(path).pathname;
  } catch { /* not a full URL — treat as a path */ }
  path = path.split('?')[0].split('#')[0].replace(/\/+$/, '');
  const m = path.match(/\/flights\/([^/]+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

// Language from a URL prefix: /en/flights/… → 'en'; unprefixed root → 'de'.
function languageFromUrl(url) {
  if (!url) return DEFAULT_LANGUAGE;
  let path = String(url);
  try {
    if (/^https?:\/\//i.test(path)) path = new URL(path).pathname;
  } catch { /* path already */ }
  const m = path.match(/^\/([a-z]{2})\//);
  const prefix = m && m[1];
  const known = new Set(['en', 'ar', 'es', 'fr', 'it', 'nl', 'tr']);
  return prefix && known.has(prefix) ? prefix : DEFAULT_LANGUAGE;
}

// One raw row → a shallow canonical view (not yet aggregated). Returns null for
// a row with no usable URL/slug key at all.
function normalizeGscRow(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const url = str(raw, ['url', 'page', 'Page', 'link', 'address']);
  const slug = str(raw, ['slug']) || slugFromUrl(url);
  // This is a ROUTE-PAGE opportunity detector: a row is only usable when it
  // resolves to a /flights/<slug> page. Non-flights URLs (city/airport/blog) and
  // junk rows are dropped rather than reported with an empty slug.
  if (!slug) return null;
  return {
    url: url || `/flights/${slug}`,
    slug,
    language: str(raw, ['language', 'lang']) || languageFromUrl(url),
    primaryQuery: str(raw, ['query', 'Query', 'keyword', 'search_term', 'primaryQuery']),
    impressions: num(raw, ['impressions', 'Impressions']),
    clicks: num(raw, ['clicks', 'Clicks']),
    position: num(raw, ['position', 'Position', 'avg_position', 'average_position']),
  };
}

// Aggregate a URL's rows into one canonical per-URL row (GSC-style).
function aggregate(rows) {
  const key = rows[0].slug || rows[0].url;
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
    slug: key && key === best.slug ? best.slug : (best.slug || null),
    language: best.language || DEFAULT_LANGUAGE,
    primaryQuery: best.primaryQuery || null,
    impressions: impKnown ? impSum : null,
    clicks: clickKnown ? clickSum : null,
    position: position == null ? null : Math.round(position * 100) / 100,
    queries: rows.filter((r) => r.primaryQuery).length,
  };
}

// Normalize + de-duplicate a whole raw export. Rows for the same URL/slug (the
// many per-query rows GSC emits) collapse into one aggregated per-URL row.
function normalizeGscRows(rawRows) {
  if (!Array.isArray(rawRows)) return [];
  const byKey = new Map();
  for (const raw of rawRows) {
    const row = normalizeGscRow(raw);
    if (!row) continue;
    const key = row.slug || row.url;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(row);
  }
  return [...byKey.values()].map(aggregate);
}

module.exports = { normalizeGscRow, normalizeGscRows, slugFromUrl, languageFromUrl };
