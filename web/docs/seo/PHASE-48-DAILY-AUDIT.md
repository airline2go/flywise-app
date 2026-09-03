# Phase 48 — Automated Daily SEO Data Audit

A scheduled GitHub Action runs the Phase 28 route auditor against the **live**
route list every morning and publishes a health report, so data contradictions
are caught automatically instead of waiting for a manual sweep.

## What runs

- **Workflow:** `.github/workflows/seo-audit.yml`
  - `schedule: 0 6 * * *` (06:00 UTC daily) + manual `workflow_dispatch`.
  - `npm ci` in `web/`, then `node scripts/audit-route-data.mjs --json`.
  - Formats the JSON report into the **run summary** (severity table + per-check
    breakdown + first 50 issues).
  - **Fails the run only on a `critical` issue** — a genuine internal
    contradiction / broken route. Warning-level drift (e.g. F-8's stale
    `airline_count` vs the join) is surfaced in the summary without failing.
- **Auditor:** `lib/seo/route-data-audit.mjs` (shipped in Phase 28) — the single
  definition of a valid route.

## Why GitHub Actions (not a Vercel cron)

- No runtime/API surface added to the app; the check can never affect page
  serving or crawl cost.
- Reads only the public content API (`api.airpiv.com`) — no secrets, no DB
  writes, no external price calls.
- Native CI artifact: the report lives in the run summary, and a red run is the
  alert.

## Scope

This job covers **data-quality** checks. Render-level SEO checks (title/H1/
canonical/hreflang presence on the actual served HTML) belong to the real
production crawler (Phases 50/51), which needs the deployed site rather than the
build-time data — kept separate on purpose.

## Extending it

`byCode` in the report is the natural place to add checks: add a rule to
`CHECKS`/`auditRoutes` in `route-data-audit.mjs` (with a `critical`/`warning`
severity) and it flows into the daily summary automatically.
