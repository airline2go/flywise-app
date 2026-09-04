# Rendering / Response Contract (P0-4)

The one place the site's page-response states are defined. Every SEO route
handler (`web/app/[lang]/…/route.js` and the unprefixed `web/app/(de)/…`
group) resolves to exactly one of these states. The point of writing it down:
an **UPSTREAM_ERROR must never be served — or cached — as a `200` (empty or
`noindex`) page**, and an error page must never enter a sitemap.

## States

| State | HTTP | Indexable | How it is produced |
| --- | --- | --- | --- |
| **VALID_PAGE** | `200` | `index, follow` | Data present and passes validation; the renderer emits full content, self-canonical, hreflang, JSON-LD. |
| **DATA_NOT_FOUND** | `404` | — | The detail fetch returns `null` (backend answered `404`). `renderXHtml()` returns `null` → `htmlResponse(null)` → `404`. A genuinely missing entity, cached as a clean `404`. |
| **UPSTREAM_ERROR** | `5xx` | — | The detail/list fetch **throws** (network error, `429`, or `5xx` after bounded retry). The throw propagates out of the route handler → Next returns `5xx`, and ISR keeps serving the **last good page**. Never swallowed into a `200`. |
| **INVALID_DATA** | `200` | `noindex, follow` | Data is present but self-contradictory/broken (see *critical* below). The page stays reachable for users but is kept out of the index. |
| **THIN_CONTENT** | `200` | `noindex, follow` | Data is valid but too sparse to be useful (no real intelligence signals and no admin-authored content). Reachable, not indexed. |

## Where each state is enforced (source of truth)

- **Transport (`lib/content-api.js`)**
  - `fetchJSON()` — retries `429`/`5xx`/network with backoff, **fails fast on
    other `4xx`**, and **throws** once retries are exhausted. This is what makes
    UPSTREAM_ERROR a throw, not a value.
  - `fetchDetailOrNull()` — maps a backend `404` to `null` (DATA_NOT_FOUND) and
    **re-throws every non-`404`** (UPSTREAM_ERROR). `getRoutePage/getCity/…` use it.
- **Route boundary (`lib/legacy-render/serve.js`)** — `htmlResponse(null)` →
  `404`; `htmlResponse(html)` → `200 text/html`.
- **Indexability (`lib/legacy-render/route-snapshot.js`)** — `validateSnapshot()`
  lists all invariant violations; `criticalSnapshotErrors()` is the narrow
  subset (`origin-equals-destination`, `invalid-price`, `stop-total-mismatch`)
  that marks INVALID_DATA. The flight renderer sets `noindex, follow` when there
  is a critical error **or** the page is thin. A stale `airline-count-mismatch`
  is intentionally a *warning*, not critical, so healthy pages are never
  mass-noindexed.

## Sitemap safety

Sitemaps are **not** built by crawling rendered pages — they are built from the
dedicated paginated `/sitemap-data/<type>` feeds (`lib/content-api.js`
`fetchAllSitemapData`). Consequences:

- A `404`/`5xx` page **cannot** appear in a sitemap: it was never in the feed.
- If a feed is briefly unavailable, `fetchAllSitemapData` degrades a
  page-0 `404` to an empty type and **re-throws any other error**, so ISR keeps
  serving the last good sitemap rather than overwriting it with a partial set.

## Tests

- `test/response-contract.test.mjs` — transport (`404`→null vs error→throw,
  retry, fail-fast `4xx`), `htmlResponse`, INVALID_DATA classification, and an
  end-to-end renderer check that a non-thin route with a critical contradiction
  is `noindex`.
- `test/render-seo-guards.test.mjs` — THIN_CONTENT `noindex` for flight and
  entity pages, and that pages with real data / admin content index.
- `test/render-sitemap.test.mjs`, `test/sitemap-*` — sitemap composition.

## Rollback

This is a documentation + test-only artifact; it changes no runtime behaviour.
