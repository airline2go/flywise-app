# P0-1 / P0-11 — Route Indexability Audit (report-only)

**Date:** 2026-09-14 · **Source:** live production DB (`flyise` / `tflpaysskecpmdpwbvog`), not documentation.
**Status:** policy shipped **report-only** (`SEO_EVIDENCE_POLICY_ENFORCED` unset ⇒ legacy behaviour, **no page flipped**).

## Canonical policy

One module, no forks:
- backend: `flywise-server/src/services/indexability.js` → `hasVerifiedFlightEvidence` / `getRouteIndexabilityDecision`
- frontend mirror: `flywise-app/web/lib/legacy-render/route-evidence.js`
- parity guaranteed by the shared fixture `test/fixtures/route-evidence-cases.json` (identical in both repos).

`hasVerifiedFlightEvidence(route) = true` iff **any**: `airline_count>0` · valid `avg_duration_min>0` · real `stop_distribution` · `price_sample_count>0` · `itinerary_count>0`.
`distance_km` alone is **never** evidence. `airline_count=0` alone is **never** evidence. Manual `intro_text`/`custom_faq` keeps a page indexable as an editorial exception.

## Current production snapshot

| Metric | Value |
|---|---:|
| Published routes | 2063 |
| Published routes with carrier evidence (`airline_count > 0`) | 1746 |
| Published routes with duration evidence | 1884 |
| Published routes with stop evidence | 1884 |
| Published routes with itinerary evidence | 1884 |
| Published routes with **no hard flight evidence** | **178** |
| Published routes with `airline_count = 0` | 317 |
| Zero-airline routes that already have other hard evidence | 139 |
| Published origin/destination pair duplicates | 0 |

The current `no hard flight evidence` count is the important number for the eventual strict-policy review. It must **not** be treated as the final noindex set yet: routes can still be recoverable through the owner-gated Duffel backfill and multi-date health-check process.

## Backfill / health-check gate

Do **not** flip the strict evidence policy yet. The production operations runbook remains owner-gated:
1. Run the bounded airline backfill over published routes with `airline_count IS NULL OR airline_count = 0`.
2. Run the safe multi-date health-check over the remaining candidates; transient API errors and a single empty date must not mark a route dead.
3. Re-run this report and review the shortened no-evidence list.
4. Only then consider enabling `SEO_EVIDENCE_POLICY_ENFORCED=1` on both backend and renderer.

No production data, indexing policy, or URL state is changed by this report.

## Tests / parity

The strict-policy implementation is covered by the backend indexability tests and the frontend shared-fixture/renderer tests. Keep the backend and frontend evidence definition in parity when changing either side.

## Rollback

This report is documentation-only. The strict policy remains OFF unless the explicit environment flag is enabled.
