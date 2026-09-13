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

// [RENDERABILITY-GUARD] A canonical winner MUST be a slug the route detail
// endpoint can actually serve — presence in the /route-pages LIST feed is NOT
// proof a page renders (a list row can exist with no servable detail, which
// produced a 301 → 404 for a ranking page). So every winner-selecting function
// here accepts an OPTIONAL `isRenderable(slug) => boolean` predicate. When it is
// passed, candidates are filtered to renderable slugs before a winner is chosen
// (and a pair with no renderable slug at all is dropped entirely — never
// consolidated). When it is omitted the behaviour is byte-for-byte the old
// slug-only rule, so the sitemap builder — which has only slug+IATA, no way to
// probe detail — keeps picking the exact same winner it always did.

// The canonical winner among slugs that share one airport pair. With an
// `isRenderable` predicate, only renderable slugs are eligible (falling back to
// the full set only when NONE render, so callers can still detect that case).
export function pickCanonicalSlug(slugs, isRenderable = null) {
  let candidates = [...new Set(slugs)];
  if (isRenderable) {
    const renderable = candidates.filter((s) => isRenderable(s));
    if (renderable.length) candidates = renderable; // else: none render — keep all so caller sees a dead winner
  }
  const sorted = candidates.sort();
  const cityName = sorted.filter((s) => !IATA_PAIR.test(s));
  return (cityName.length ? cityName : sorted)[0];
}

// Build a Map(loserSlug -> winnerSlug) over the full route list. Only EXACT
// duplicates (2+ slugs on the same origin/destination IATA pair) are included;
// a winner or a unique route is simply absent from the map (so `.get(slug)`
// returns undefined → it is its own canonical). Accepts rows shaped either
// { slug, origin_iata, destination_iata } (route-pages feed) or { id, o, d }
// (sitemap-data feed).
//
// With an optional `isRenderable(slug)` predicate the winner is chosen only
// among renderable slugs, and a pair whose chosen winner still does not render
// (i.e. NO slug in the pair renders) is skipped — so the map can never map a
// loser to a non-renderable winner. Losers whose only renderable option is
// themselves are likewise not added. Without the predicate, unchanged.
export function buildCanonicalSlugMap(routes, isRenderable = null) {
  const byPair = groupSlugsByPair(routes);
  const map = new Map();
  for (const slugs of byPair.values()) {
    const uniq = [...new Set(slugs)];
    if (uniq.length < 2) continue;
    const winner = pickCanonicalSlug(uniq, isRenderable);
    // Guard: with a renderability predicate, never emit a redirect to a winner
    // that does not render (the whole pair is dead) — that is the 301 → 404 bug.
    if (isRenderable && !isRenderable(winner)) continue;
    for (const s of uniq) if (s !== winner) map.set(s, winner);
  }
  return map;
}

// Group every slug by its airport pair. Map(pairKey -> string[] slugs). Same
// row-shape tolerance as buildCanonicalSlugMap. Exposed so the redirect layer
// can find a slug's pair-mates to verify their renderability.
export function groupSlugsByPair(routes) {
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
  return byPair;
}

export { IATA_PAIR };
