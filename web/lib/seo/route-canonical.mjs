// [ROUTE-CANONICAL] P0-28 — consolidate EXACT-duplicate route pages: the same
// city pair AND the same airport pair (origin_iata, destination_iata) served
// under more than one slug (e.g. `ams-vie` and `amsterdam-vienna`). Those render
// an identical <title> and are the same underlying route, so one is the
// canonical page and the rest point their <link rel="canonical"> (and hreflang)
// at it and are dropped from the sitemap. URLs are NOT changed or redirected —
// duplicates stay reachable, their indexing signal just consolidates onto one.
//
// The winner rule is SLUG-ONLY on purpose: the sitemap feed carries only slug +
// IATA codes (no route_score), so both the renderer and the sitemap builder must
// pick the SAME winner from the same information. Rule: prefer the descriptive
// city-name slug over the bare IATA-pair slug; tie → alphabetical (deterministic
// and independent of input order).

const IATA_PAIR = /^[a-z]{3}-[a-z]{3}$/;

// The canonical winner among slugs that share one airport pair.
export function pickCanonicalSlug(slugs) {
  const sorted = [...new Set(slugs)].sort();
  const cityName = sorted.filter((s) => !IATA_PAIR.test(s));
  return (cityName.length ? cityName : sorted)[0];
}

// Build a Map(loserSlug -> winnerSlug) over the full route list. Only EXACT
// duplicates (2+ slugs on the same origin/destination IATA pair) are included;
// a winner or a unique route is simply absent from the map (so `.get(slug)`
// returns undefined → it is its own canonical). Accepts rows shaped either
// { slug, origin_iata, destination_iata } (route-pages feed) or { id, o, d }
// (sitemap-data feed).
export function buildCanonicalSlugMap(routes) {
  const byPair = new Map();
  for (const r of routes || []) {
    const slug = r.slug ?? r.id;
    const o = r.origin_iata ?? r.o;
    const d = r.destination_iata ?? r.d;
    if (!slug || !o || !d) continue;
    const key = `${o}-${d}`;
    if (!byPair.has(key)) byPair.set(key, []);
    byPair.get(key).push(slug);
  }
  const map = new Map();
  for (const slugs of byPair.values()) {
    const uniq = [...new Set(slugs)];
    if (uniq.length < 2) continue;
    const winner = pickCanonicalSlug(uniq);
    for (const s of uniq) if (s !== winner) map.set(s, winner);
  }
  return map;
}

export { IATA_PAIR };
