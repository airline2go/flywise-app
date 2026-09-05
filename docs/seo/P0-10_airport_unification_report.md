# P0-10 — Airport existence / sitemap / renderer unified to one decision

**Date:** 2026-09-05

> Note: an earlier commit mislabeled the *language source of truth* work as "P0-10"; that item is actually **P1-10** (done). This is the real **P0-10**.

## Defect
Three different bases decided whether an airport page was indexable:
- **Renderer** (`render-airport` → `robotsMeta`): indexable iff distinct-destination count ≥ 2 OR admin traveler content.
- **Sitemap** (`buildAirportUrls`): included **every** IATA code appearing in the routes feed, excluding only airports present in the `/airports` table and flagged `indexable:false`. A **fallback** airport (no authoritative row) was therefore **always kept** — even with <2 destinations.
- Result: a fallback airport with 1 destination was **noindex in the renderer but present in the sitemap** — the exact sitemap-says-index / renderer-says-noindex contradiction.

## Fix — one backend decision
- New `GET /sitemap-data/airports` (backend) is the **single source of truth**: the airport universe = every IATA code in a published route (`connectivity.airportDest`) ∪ every authoritative published `airports` row; each code's `indexable` flag is the **same `airportIndexable` rule the renderer uses** (≥2 distinct destinations OR admin content), computed from the shared connectivity (which is evidence-aware once P0-1 is enforced — so all layers move together at the flip).
- `buildAirportUrls` (frontend) now consumes that feed: an airport is in the sitemap iff the feed says `indexable !== false`. Fallback airports are covered identically to authoritative ones. Freshest per-airport `lastmod` still comes from the routes feed. Deploy-order safe: if the feed isn't live yet, it falls back to the prior rule.

Now renderer, sitemap, `/airports`, and audits all read the same rule → they cannot disagree, including for fallback airports.

## Tests
- Backend `sitemap.routes.test.js`: new case — fallback airport with 1 distinct destination → `indexable:false`; ≥2 → `true` (7 pass).
- Full app suite **404** pass.

## Follow-up (documented, not needed today)
When the P0-1 evidence policy is enforced, the renderer computes its own `destinationCount` from the airport's routes rather than the (evidence-filtered) backend connectivity. To keep them locked after the flip, the airport detail endpoint should return the backend `indexable` flag and the renderer should consume it. Not required now (policy flag OFF ⇒ both use all published routes ⇒ identical results today).

## Rollback
Revert commits; the new endpoint is additive. No migration, no data/URL change.
