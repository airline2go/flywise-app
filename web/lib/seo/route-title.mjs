// [ROUTE-TITLE-DISAMBIGUATION] Two routes can share an identical city-name
// <title> ("Flights from Frankfurt to Hamburg …") while being genuinely
// DIFFERENT routes — same city pair, different airport pair (e.g. FRA→HAM vs
// FRA→XFW Hamburg-Finkenwerder, or Abu Dhabi→London via LGW vs LHR). Those are
// NOT duplicates (P0-28's buildCanonicalSlugMap only consolidates the SAME
// airport pair), so they must stay separate pages — but each needs a UNIQUE
// title, or Google folds them together on its own.
//
// This decides, for every route that SURVIVES P0-28 consolidation, whether its
// title must be qualified with the airport and on WHICH endpoint. Only the
// endpoint that actually VARIES within the collision group is qualified (if two
// Frankfurt→Hamburg routes differ only in the Hamburg airport, only the
// destination is qualified — the origin stays the clean city name). A route
// whose city-pair title is already unique is absent from the map (→ no change).
//
// Pure + slug-keyed like route-canonical.mjs, so the renderer (per-page) and any
// audit can derive the same decision from the same full route list. Grouping is
// on the RAW (unlocalized) city names, so one map is correct for every language
// (the collision exists identically in all of them).

import { buildCanonicalSlugMap } from './route-canonical.mjs';

// Map(slug -> { origin: bool, destination: bool }) — present only for routes in
// a genuine multi-airport title collision. Accepts rows shaped either
// { slug, origin_iata, destination_iata, origin_city, destination_city } or the
// { id, o, d } sitemap-feed shape (city names absent there → that row can't
// collide by title and is skipped).
export function buildTitleDisambiguationMap(routes) {
  const losers = buildCanonicalSlugMap(routes); // exact-pair dupes are consolidated away
  const byTitle = new Map();
  for (const r of routes || []) {
    const slug = r.slug ?? r.id;
    const o = r.origin_iata ?? r.o;
    const d = r.destination_iata ?? r.d;
    const oc = r.origin_city;
    const dc = r.destination_city;
    if (!slug || !o || !d || oc == null || dc == null) continue;
    if (losers.has(slug)) continue; // renders a canonical to its winner — leave it
    const key = `${oc}|${dc}`;
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key).push({ slug, o, d });
  }
  const map = new Map();
  for (const rows of byTitle.values()) {
    const pairs = new Set(rows.map((r) => `${r.o}-${r.d}`));
    if (pairs.size < 2) continue; // title already unique → nothing to qualify
    const origin = new Set(rows.map((r) => r.o)).size > 1;
    const destination = new Set(rows.map((r) => r.d)).size > 1;
    for (const r of rows) map.set(r.slug, { origin, destination });
  }
  return map;
}
