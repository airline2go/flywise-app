# P0-1 / P0-11 — Route Indexability Audit (report-only)

**Date:** 2026-09-05 · **Source:** live production DB (`flyise` / `tflpaysskecpmdpwbvog`), not documentation.
**Status:** policy shipped **report-only** (`SEO_EVIDENCE_POLICY_ENFORCED` unset ⇒ legacy behaviour, **no page flipped**).

## Canonical policy

One module, no forks:
- backend: `flywise-server/src/services/indexability.js` → `hasVerifiedFlightEvidence` / `getRouteIndexabilityDecision`
- frontend mirror: `flywise-app/web/lib/legacy-render/route-evidence.js`
- parity guaranteed by the shared fixture `test/fixtures/route-evidence-cases.json` (identical in both repos).

`hasVerifiedFlightEvidence(route) = true` iff **any**: `airline_count>0` · valid `avg_duration_min>0` · real `stop_distribution` · `price_sample_count>0` · `itinerary_count>0`.
`distance_km` alone is **never** evidence. `airline_count=0` alone is **never** evidence. Manual `intro_text`/`custom_faq` keeps a page indexable as an editorial exception.

## Production numbers (before)

| Metric | Value |
|---|---|
| Total route rows (all statuses) | 2347 |
| Published routes | 2072 |
| Currently indexable (legacy: distance counts) | 2072 (100%) |
| Would stay indexable under policy | 1890 |
| **Would flip indexable → noindex** | **182** |
| Zero-airline published | 320 (138 still have duration/stopdist/itinerary → stay indexable) |
| Manual `intro_text` / `custom_faq` in production | 0 / 0 |

## The 182 candidates — bucketed (full list: `182-noindex-candidates.csv`)

| Bucket | Meaning | Count |
|---|---|---|
| A — clearly no evidence | none | 0 |
| **B — recoverable by backfill** | never health-checked / never had flight data fetched | **176** |
| C — evidence exists but audit can't see it | `route_airlines` join rows present but `airline_count` unsynced | 0 |
| D — manual/editorial exception | none | 0 |
| **E — investigate** | health-checked once, no offers (needs multi-date, P0-3) | **6** |

### Why NOT to auto-flip (evidence)
- **Bucket B (176)** includes obviously-real routes never backfilled: `ams-auh` (Amsterdam→Abu Dhabi, Etihad daily), `arn-hel` (Stockholm→Helsinki), `arn-lgw` (Stockholm→London). Their `airline_count` is `0/NULL` only because insights/backfill never ran — not because there are no flights.
- **Bucket E (6):** `auh-arn`, `ist-ruh`, `lhr-kwi`, `mad-mxp`, `pmi-mad` are real daily routes wrongly zeroed by the **single-date** health check (checked 2026-07-30). Only `cgd-ath` (Changde, China → Athens) is a genuine phantom. This is a direct demonstration of the **P0-3** defect.

### Recommendation
Do **not** flip the 182 yet. First run airline/flight-data **backfill + a P0-3-safe multi-date health check** over buckets B and E. Re-run this report; only routes that still have **zero verified evidence after a real data-fetch attempt** (expected: the CGD phantoms and any truly dead pair) become the final noindex set. The flip is then enabling `SEO_EVIDENCE_POLICY_ENFORCED=1` after that re-review.

## Tests
- `flywise-server/test/indexability.test.js` — 55 pass (policy truth table + gated connectivity).
- `flywise-app/web/test/route-evidence.test.mjs` — 31 pass (shared-fixture parity).
- `flywise-app/web/test/render-seo-guards.test.mjs` + `indexability.test.mjs` — 19 pass (renderer behaviour preserved).

## Rollback
Pure code + an env flag that defaults OFF. Rollback = revert the commits (or ensure `SEO_EVIDENCE_POLICY_ENFORCED` is unset). No DB migration, no data change, no URL change in this batch.
