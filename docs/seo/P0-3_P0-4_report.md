# P0-3 (health-check safety) & P0-4 (persistent redirects)

**Date:** 2026-09-05 · **DB:** `flyise` / `tflpaysskecpmdpwbvog`

## P0-3 — Route health-check no longer trusts a single date

**Before:** `health-check-batch` probed one date (today+21). One empty result → `status='dead'` immediately. Seasonal/weekly routes and single-date gaps were wrongly killed (the 6 "E-investigate" routes from the P0-1 report — `ist-ruh`, `lhr-kwi`, `mad-mxp`, `pmi-mad` — are exactly this false negative).

**After (`admin.routes.js` + `services/routeHealth.js`):**
- Probes several representative dates (`HEALTH_CHECK_DATE_OFFSETS`, default `21,60,135`). Any date with offers → **alive**.
- A run counts as **empty** only when *every* probed date returned a clean empty. Any 429/5xx/timeout/network error → run is **unknown** — never dead, retried next run.
- A route becomes **dead** only after the empty result **repeats** across runs (`HEALTH_CHECK_DEAD_STREAK`, floor 2). One empty run → *candidate*, re-checked later. An alive result resets the streak.
- Migration `seo_p0_3_health_check_streak.sql` adds `health_empty_streak` + `health_last_result` (additive, applied & verified in prod).

**Acceptance:** empty single date → not dead ✓ · timeout/429/500 → never dead ✓ · seasonal route survives one empty date ✓ · repeated empties → candidate→dead ✓. Tests: `test/routeHealth.test.js` (16).

## P0-4 — Duplicate redirects are now persistent

**Before:** loser→winner 301 was derived live from the published route list (`buildCanonicalSlugMap`). Deleting a loser row made the redirect vanish → the old (Google-known) URL 404s.

**After:**
- New table `route_redirects` (`source_slug` UNIQUE, `target_slug`, `status_code`, `reason`) — migration `seo_p0_4_route_redirects.sql`, applied to prod.
- **Backfilled the 10 published duplicate losers** BEFORE any loser deletion (rule #4). 0 chains. (The 11th pair `xfw-ber`/`hamburg-berlin` is both-dead → skipped, target isn't live.)
- Backend `GET /route-redirects` feed; frontend `resolvePersistentRedirect()` (cached, chain-collapse-safe).
- Route handlers (`(de)` + `[lang]/flights/[slug]`) now check **persistent redirect first**, then the live F1 backstop, then render, then 404. Single hop; `redirectResponse(target, status)`.

**Acceptance:** duplicate old slug → 301 to canonical ✓ · target → 200 (not a source) ✓ · **delete loser row → old slug still 301** (redirect lives in `route_redirects`, independent of route_pages) ✓ · one hop only ✓. Tests: `test/route-redirects.test.mjs` (3).

## Tests / CI
- Backend: 100 pass across touched suites (`routeHealth`, `content.routes`, `sitemap.routes`, `indexability`). `npm ci` clean.
- App: **389** pass (full suite). `npm ci` clean.

## Rollback
- P0-3: revert code; `DROP COLUMN health_empty_streak, health_last_result` (or leave — unused columns are harmless).
- P0-4: revert handlers/content-api/endpoint; `DROP TABLE route_redirects`. No URL changed; no loser row deleted.

## Still pending / next
- Enabling the 182 flip still waits on backfill + re-review (P0-1).
- P1-1 unique constraint on `(origin_iata,destination_iata)` remains blocked until the 10 duplicate losers are removed — now safe to remove because their redirects are persistent, but that's a separate, reviewed step.
