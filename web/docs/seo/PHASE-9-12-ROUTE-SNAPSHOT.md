# Phases 9–12 — Unified Route Snapshot + Central TTL Policy

**Builds on:** Phase 1 (`PHASE-1-CANONICAL-PRICE-SOURCE.md`).
**Requires production:** No. **Behaviour-preserving** — rendered HTML is
byte-identical (all render/FAQ/facts/price/meta/live-script tests still pass);
this is an internal consolidation, not an output change.

## Goal (the FINAL RULE)

> ONE DATA SOURCE → ONE SEO MODEL → ONE CANONICAL PAGE → CONSISTENT OUTPUT EVERYWHERE.

Phase 1 unified the **price**. Phases 9–14 extend that to the whole route page:
one snapshot object supplies price, airline count, stop split, durations,
distance and freshness, and every section reads from it instead of re-deriving
the same numbers on its own.

## OLD architecture

Each section re-derived shared values from the raw route row:

- airline count via a local `effectiveAirlineCount(route)` (called 3×);
- the nonstop / 1-stop / 2+ split computed inline in **two** places
  (`buildFaqItems` and `buildRouteFactsHtml`) with slightly different reducers;
- price via `resolveCanonicalPrice(route)` (called 4×);
- the "live" freshness window as a bare `FRESH_MS = 24h` literal in the client
  script.

Two independent computations of the same thing are exactly how "8 airlines vs a
14-name list", "150 offers vs buckets summing to 152", or "2h30 vs 2h40" arise.

## NEW architecture

```
                       buildRouteSnapshot(route)          ← lib/legacy-render/route-snapshot.js
                                  │
   ┌─────────┬──────────┬─────────┴────────┬──────────┬──────────┬──────────┐
  price   airlineCount   stops(…,total,     avgDuration  distanceKm  freshness
 (Phase1)  (Phase13)     nonstopShare)      minDuration             (Phase12 TTL)
   │            │            │                  │            │          │
   └── hero, title, meta, Offer, intro, route-facts, FAQ, price panel, schema ──┘
```

- **`lib/legacy-render/route-snapshot.js`** — `buildRouteSnapshot(route)`
  returns the canonical object; `resolveCanonicalPrice`, `deriveAirlineCount`
  and `deriveStops` are its building blocks; `validateSnapshot(route, snapshot)`
  returns the list of invariant violations.
- **`lib/legacy-render/ttl.js`** — the single freshness policy:
  `LIVE_PRICE_TTL_MS` (24h), `PRICE_TTL_MS` (7d), `ROUTE_DATA_TTL_MS` (30d),
  `ROUTE_PAGE_REVALIDATE_S` (86400), and `isFresh(checkedAt, ttlMs)`.
- **`render-flight-route.js`** builds the snapshot once at the top of
  `renderFlightRoutePage` and threads it into `buildDynamicIntro`,
  `buildFaqItems`, `buildRouteFactsHtml` and `buildLiveScript`; the local
  `effectiveAirlineCount`, `validateRouteConsistency` and duplicate
  `resolveCanonicalPrice` are removed.

## Invariants enforced (Phase 10/13/14)

`validateSnapshot` checks, and logs (non-fatal) on violation:

- `airlineCount === unique(routeAirlines).length` when a list exists;
- stop buckets sum to their `total`;
- a present `stop_distribution` must yield a positive total;
- a present price must be positive with a currency;
- `origin !== destination`.

Publication-gating on these (do-not-publish / error queue) is a deliberate
follow-up (**F-2**); this PR keeps the guard non-fatal, as before.

## Freshness semantics (Phase 12)

`snapshot.priceIsFresh` / `snapshot.routeDataIsFresh` derive from the central
TTL windows, and the client live-price "live" gate now bakes
`LIVE_PRICE_TTL_MS` from `ttl.js` instead of a private literal — so "live" means
the same thing in every place that asks.

## Files changed

- **new** `lib/legacy-render/route-snapshot.js`, `lib/legacy-render/ttl.js`
- `lib/legacy-render/render-flight-route.js` (consolidated onto the snapshot)
- **new tests** `test/route-snapshot.test.mjs`, `test/ttl.test.mjs`

## Not changed / out of scope

- The per-segment `export const revalidate = 86400` in the route handlers stays
  a **literal** — Next.js statically analyses it at build time, so it cannot be
  an imported constant. `ttl.ROUTE_PAGE_REVALIDATE_S` documents the canonical
  value and the literals match it; this is a framework constraint, not drift.
- Rendered HTML is unchanged; no SEO strategy, URL, sitemap, robots, hreflang or
  content change (spec 1.17).

## Validation

- `node --test` full suite: **233 pass**, 12 new tests all green. The 2 failures
  (`seo-analyze`, `sitemap-sharding`) are **pre-existing on the clean branch**
  (findings F-4/F-5), unrelated to this change.
- ESLint could not run here (dev `node_modules` not installed).
