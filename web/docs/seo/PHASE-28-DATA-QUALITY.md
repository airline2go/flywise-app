# Phase 28 — Route Database Data-Quality Audit

**Date:** 2026-09-03 · **DB:** Supabase project `flyise` (`route_pages`, `route_airlines`).
Findings tagged `[DATA-PROVEN]` come from live SQL against production data.

## Tooling delivered (reusable, Phase 28/29)

- **`lib/seo/route-data-audit.mjs`** — pure `auditRoute(row)` / `auditRoutes(rows)`; one definition of "valid route", classifying every violation as `critical` (block-index contradiction) or `warning` (stale/soft). Never mutates, never throws.
- **`scripts/audit-route-data.mjs`** — CLI sweep over the live route list via `content-api` (`--json`, `--fail-on-critical` for CI/cron). Foundation for the Phase 48 daily job.
- **`test/route-data-audit.test.mjs`** — fixture coverage for every check.

## Live results `[DATA-PROVEN]` — 2,347 published routes

All hard/numeric/logical checks returned **0 violations**:

| Check | Count |
|---|---|
| not published | 0 |
| origin = destination | 0 |
| missing IATA / slug | 0 |
| distance ≤ 0 | 0 |
| negative price (min/avg/max) | 0 |
| price_min > price_max | 0 |
| price_avg < min / > max | 0 |
| avg_duration ≤ 0 | 0 |
| min_duration > avg_duration | 0 |
| negative airline_count | 0 |
| future price / insights timestamp | 0 |
| invalid haul_type | 0 |
| negative sample_count | 0 |
| stop buckets negative | 0 |
| all_direct=true but has stops | 0 |
| direct=false but has nonstop | 0 |

**The route dataset is clean on every internal-contradiction check.** This is a
genuine, evidence-backed "what is correct" result (spec's principle: prove
what's right, not just what's wrong).

## The one real discrepancy `[DATA-PROVEN]` — F-8 (P2, warning)

**7 of 2,347** routes have a stored `airline_count` that differs from the number
of distinct airlines in the `route_airlines` join:

| slug | stored | unique in join |
|---|---|---|
| london-athens (LHR→ATH) | 8 | 24 |
| berlin-rome (BER→FCO) | 8 | 23 |
| berlin-lisbon (BER→LIS) | 8 | 20 |
| zuerich-barcelona (ZRH→BCN) | 8 | 20 |
| las-palmas-hamburg (LPA→HAM) | 8 | 13 |
| zrh-prg (ZRH→PRG) | 8 | 13 |
| doh-lgw (DOH→LGW) | 5 | 6 |

**Not a rendered-page bug, and not blindly "fixable" by editing the number.**

1. **The page is already consistent.** The Phase 9–12 snapshot uses the visible
   airline *list* as authoritative (`deriveAirlineCount`), so whatever the page
   shows, its count card, intro clause and FAQ all agree. The F-2 gate
   deliberately treats a stored-scalar mismatch as a *warning*, not a reason to
   de-index — confirmed correct here.
2. **The "right" number is ambiguous by definition.** For LHR→ATH: the join has
   24 rows ever seen, 12 active in the last 30 days, 24 in 90 days; stored is 8.
   `route_airlines` accumulates carriers over time (`first_seen_at`/`last_seen_at`),
   so "unique in join" (all-time) is *not* automatically the correct current
   count. Overwriting `airline_count` with 24 could over-state currently-served
   carriers.

**Recommendation (FINAL RULE — fix the source, not the number):** the durable
fix is in the **backend recompute pipeline** (flywise-server) that populates
`route_pages.airline_count` — it should derive the scalar from the *same* set
the page renders (e.g. carriers active within a defined window), so the stored
value, the page list and this audit all agree. A blind SQL `UPDATE` is
deliberately **not** applied here: it bypasses that pipeline (the next run would
re-stale it) and encodes an unproven definition of "current". Tracked as **F-8**
for a backend change + a one-time backfill through that same code path.

## How to run

```
cd web && node scripts/audit-route-data.mjs            # summary
        node scripts/audit-route-data.mjs --json       # machine-readable
        node scripts/audit-route-data.mjs --fail-on-critical   # CI/cron gate
```

The stored-count-vs-join check (F-8) needs the `route_airlines` join, which the
`content-api` route list doesn't carry; the SQL used for the table above lives
in this doc and should move into the Phase 48 job (which can query the DB).
