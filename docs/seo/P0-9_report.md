# P0-9 — Route data audit can now actually see the data it checks

**Date:** 2026-09-05

## Defect
`scripts/audit-route-data.mjs` fed the auditor from `listRoutePages()`, but the public `/route-pages` endpoint **strips** `avg_duration_min`, `stop_distribution`, and never even selects `price_min/avg/max`, `min_duration_min`, `all_direct`. So the auditor's critical checks (bad-avg-duration, price-order, all-direct-but-has-stops, stop-distribution-negative, …) ran on `undefined` and **never fired** — the audit "passed" while blind.

## Fix
1. **Dedicated full-field feed** (backend): `GET /route-pages-audit` returns the complete field set every check needs (duration, price, stop_distribution, all_direct, airline_count, distance, status, content, timestamps). Internal-only — guarded by a shared `AUDIT_TOKEN` (feature-off → 404 when unset); never part of the public API, so the public payload is unchanged.
2. **Blind-field guard** (`route-data-audit.mjs`): the auditor declares the fields its critical checks depend on; if any is absent from **every** row of a non-empty dataset (i.e. the source stripped it), it emits a **CRITICAL `audit-blind`** finding. A field-stripped source now **fails** instead of silently passing — "if the audit can't see a field, the check is not a pass."
3. **Script** (`audit-route-data.mjs`): prefers `/route-pages-audit` when `AUDIT_TOKEN` is set (paginated, fails on non-200); falls back to the public list only without a token, where the blind guard then flags the gap. Prints the data source and any blind fields.

## Tests (fixtures with intentionally bad data)
`route-data-audit.test.mjs` now also asserts:
- `blindFields` detects stripped keys; `auditRoutes` emits CRITICAL `audit-blind` for a stripped source; a full-field dataset has none.
- Intentionally bad **full-field** rows are actually caught: negative duration, price-order inversion, all-direct-with-stops, negative airline count → ≥4 criticals.

## Deploy note
Set `AUDIT_TOKEN` in the backend env and the same value in the audit runner's env to use the full feed. Until then the audit runs against the public list and reports `audit-blind` (correctly refusing to claim success).

## Tests / CI
- App full suite **404** pass; backend `content.routes` **28** pass. `npm ci` clean both.

## Rollback
Revert commits; drop the `AUDIT_TOKEN` env. No migration, no data/URL change.
