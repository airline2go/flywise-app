# P1-5 — SEO CI guard tiers (explicit separation)

**Date:** 2026-09-05

The SEO checks run in three clearly separated tiers. **Live production sitemap /
hreflang / smoke guards run on a DAILY schedule (and manual dispatch) — NOT on
every PR.** No workflow claims otherwise; this document makes the split explicit
so nobody assumes a per-PR live guarantee that isn't there.

## Tier 1 — PR CI (blocking, per push / pull_request)
`.github/workflows/ci.yml` — "CI Checks (Frontend)"
- Triggers: `push`, `pull_request`.
- Runs: `npm run lint`, `npm test` (the full offline unit/integration suite —
  `generateStaticParams` returns `[]`, no network), and `npm run build`.
- **Purely static/deterministic/offline.** It does NOT hit `airpiv.com` or any
  preview URL. The SEO logic it covers is the unit-tested pure layer
  (indexability policy, route-evidence parity, sitemap-membership structural
  audit, hreflang-audit, metadata-audit, revalidate-paths, route health, etc.).

## Tier 2 — Preview / on-demand live checks (manual)
`.github/workflows/sitemap-audit.yml`, `smoke.yml`, `seo-guards.yml` via
`workflow_dispatch` with a `base` input.
- Triggered manually against a **Vercel preview URL** (or production) before
  promoting a change. Optional — not a merge gate.

## Tier 3 — Production live guards (daily schedule)
- `seo-audit.yml` — SEO data audit, `cron: 0 6 * * *` (reads the public content API).
- `seo-guards.yml` — live smoke + `audit-sitemap` + `audit-hreflang` against
  `https://airpiv.com`, `cron: 30 6 * * *`.
- `smoke.yml` — production smoke, `cron: 0 6 * * *`.
- These are the ONLY live production sitemap/hreflang/smoke runs. They are
  **daily**, so a regression that lands between runs is caught within a day, not
  at PR time.

## What each tier can and cannot claim
- A green **PR CI** proves the pure SEO logic and the build — it does **not**
  prove the live production sitemap is reachable or that live hreflang is
  reciprocal. Those are Tier 3 (daily) / Tier 2 (on-demand) facts.
- The audits themselves never downgrade a failure to a pass: a child-sitemap
  fetch failure is CRITICAL (P1-6), and the data auditor flags fields it cannot
  see (P0-9) — so a Tier 2/3 run that couldn't actually check something fails
  rather than falsely reporting "validated".
