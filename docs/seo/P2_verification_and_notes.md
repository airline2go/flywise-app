# P2 — verification & staged-scope notes

**Date:** 2026-09-05 · DB: `flyise` / `tflpaysskecpmdpwbvog` (production; confirmed as the payment DB — `bookings`, `promo_codes` present).

## P2-1 — pagination validation ✅ (shipped, server)
`?page=` on `/route-pages` and `/route-pages-audit` now rejects non-integer / negative / out-of-range with 400 (bound 0..100000). Tests added.

## P2-8 — API robots / X-Robots-Tag ✅ (verified, no change)
`api.airpiv.com/robots.txt` = `User-agent: *` / `Disallow: /` with **no Sitemap line**; every API response carries `X-Robots-Tag: noindex, nofollow` via global middleware.

## P2-7 — blog translation data ✅ (verified live)
`blog_post_translations` has: `UNIQUE(post_id, language)`, `UNIQUE(language, slug)`, PK on `id`, and **RLS enabled**. The renderer (P0-6) only advertises alternates that actually exist and whose parent post is published — so a missing/unpublished translation is never linked.

## P2-9 — production DB verification ⚠️ CRITICAL GAP (report-only)
The security/payment migrations exist as SQL files in `flywise-server/sql/` but are **NOT applied to production**. Live checks across all schemas found **none** of:
- `webhook_events` — **missing**
- `booking_idempotency` — **missing**
- `payment_ledger` — **missing**
- promo atomic-increment / idempotency **RPC** — **missing**

`bookings` and `promo_codes` DO exist, confirming this is the right DB — the payment-hardening tables simply were never migrated.

**This is a pre-launch blocker for the payment path, but it is security/finance, not SEO.** Per the plan's own rule ("لا تخلط تغييرات SEO الحرجة مع تغييرات مالية/security") I have NOT applied them here. Recommended: a separate, reviewed migration+verification PR (owner decision) — apply `sql/webhook_events.sql`, `sql/payment_ledger.sql`, `sql/booking_idempotency*.sql`, `sql/promo_atomic_increment.sql`, then re-run this check and confirm RLS + indexes + required RPCs.

## P2-2 — route score scaling (future-safe plan, no refactor now)
`routeScore` does per-row UPDATEs — fine at today's ~2072 routes. At 50k–100k it becomes costly. **Plan (do NOT refactor in this PR):** move to batched upsert (chunks of ~500), paginate the scan, bound concurrency, and run it as a scheduled job rather than inline. Keep the scoring formula identical; only change the write path. Revisit when the catalogue passes ~10k.

## P2-3 — bot protection (no change; stable)
UA-based guard is a reasonable first layer and is spoofable by design. Left unchanged (system stable). If CPU abuse returns: add edge rate-limiting / WAF — and ensure Googlebot/Bingbot are never blocked (verify by reverse-DNS, not UA alone). No SEO-crawling impact today.

## P2-6 — SEO content engine (staged, documented)
Backend SEO generation has a **German (DE) native pack only** — this is intentional/staged, not a bug. Do NOT claim "fully multilingual programmatic SEO". Current state: DE = native generation; other languages = existing localized/static/default mechanisms per page type. No AI mass-translation is used to fill the gap (consistent with P0-8 and the social-module decision in P1-10).

## P2-4 / P2-5 — homepage & blog-listing raw HTML (tied to P0-5 decision)
- P2-5 (blog listing crawlable links) is part of the P0-5 listing decision (A/B/C) — the German listing's article links are still client-injected in `blog.html`; a server-rendered listing (option A/B) fixes it. Pending your P0-5 choice.
- P2-4 (localized homepage raw HTML) needs a raw-vs-rendered HTML check per `/xx` and, if a full localized static build is wanted, a separate PR — no URL change.

## P2-10 / P2-11 — money engine / guest auth
Explicitly out of SEO scope; separate PRs (finance correctness, guest access token). Not touched here.
