// [SITEMAP-MEMBERSHIP] P0-7 — the pure, network-free half of the sitemap↔
// indexability audit. Given the { loc } entries collected from the live
// sitemaps, it enforces the structural invariants that must hold regardless of
// what any individual page renders:
//
//   • no DUPLICATE URLs across the whole sitemap set (a URL listed twice wastes
//     crawl budget and muddies Search Console coverage);
//   • every <loc> is an ABSOLUTE https URL on the canonical host (a relative or
//     http loc is a spec violation Google may drop);
//   • no obviously non-indexable path shape slipped in (an error/asset URL).
//
// The per-URL live checks (200, not-noindex, self-canonical) are done by the
// smoke-contract 'sitemap' profile in scripts/audit-sitemap.mjs; this module is
// what makes the structural rules unit-testable.

const CANONICAL_HOST = 'airpiv.com';

// Path shapes that must never appear in a sitemap even if a feed emitted one.
const FORBIDDEN_PATTERNS = [
  /\/404(\.html)?$/i,
  /\.(?:js|css|png|jpe?g|webp|svg|ico|txt|xml|json)$/i,
  /[?#]/, // query strings / fragments — sitemaps list canonical, param-free URLs
];

// entries: array of { loc } (and optionally { lastmod, sitemap }).
// Returns { total, duplicates: [{loc, count}], nonHttps: [loc], wrongHost:
// [loc], forbidden: [{loc, reason}], ok }.
export function structuralAudit(entries) {
  const counts = new Map();
  const nonHttps = [];
  const wrongHost = [];
  const forbidden = [];

  for (const e of entries) {
    const loc = typeof e === 'string' ? e : e.loc;
    if (!loc) continue;
    counts.set(loc, (counts.get(loc) || 0) + 1);

    let u;
    try { u = new URL(loc); } catch { nonHttps.push(loc); continue; }
    if (u.protocol !== 'https:') nonHttps.push(loc);
    if (u.host.toLowerCase() !== CANONICAL_HOST) wrongHost.push(loc);
    for (const re of FORBIDDEN_PATTERNS) {
      if (re.test(loc)) { forbidden.push({ loc, reason: re.source }); break; }
    }
  }

  const duplicates = [...counts.entries()]
    .filter(([, n]) => n > 1)
    .map(([loc, count]) => ({ loc, count }));

  const ok = duplicates.length === 0 && nonHttps.length === 0 && wrongHost.length === 0 && forbidden.length === 0;
  return { total: entries.length, unique: counts.size, duplicates, nonHttps, wrongHost, forbidden, ok };
}

// Pick a spread sample (first, middle, last, and evenly-spaced middles) of up to
// `n` entries from a list — so the live check sees early, middle AND late
// entries (thin/broken pages often cluster at one end of an alphabetical feed),
// not just the first n.
export function spreadSample(list, n) {
  if (list.length <= n) return [...list];
  if (n <= 1) return [list[0]];
  const out = [];
  const step = (list.length - 1) / (n - 1);
  for (let i = 0; i < n; i++) out.push(list[Math.round(i * step)]);
  return [...new Set(out)];
}

export { CANONICAL_HOST, FORBIDDEN_PATTERNS };
