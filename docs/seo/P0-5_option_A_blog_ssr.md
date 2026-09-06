# P0-5 Option A — Server-rendered /blog + 301 /blog.html → /blog

**Scope:** P0-5 Option A only. No mass indexability/sitemap/route-URL changes; no
new redirects beyond the one required; article URLs, canonicals and hreflang
untouched.

## Problem
The blog listing was only `public/blog.html` — a static SPA that fetched
`/blog-posts` and injected article cards **client-side**. The raw HTML a crawler
saw first shipped no article links (P0-5 option B later stamped links into
blog.html at build; this is **option A**: a clean, server-rendered `/blog` URL).

## What changed
| File | Change |
|---|---|
| `web/lib/legacy-render/render-blog-list.js` (new) | `renderBlogListPage(posts)` — renders the listing through the **same `renderShell` chrome** the blog post pages use, loads the existing `public/blog.css`, and emits the hero + `blog-grid` with server-rendered `<a href="/blog/{slug}">` cards + an ItemList JSON-LD. Self-canonical `https://airpiv.com/blog`, `index,follow`. Cards mirror `scripts/prerender-blog-list.mjs`. |
| `web/lib/legacy-render/render.js` | `renderBlogListHtml(lang)` — fetches `listBlogPosts('de')` (same feed the SPA used) and renders. |
| `web/app/(de)/blog/route.js` (new) | `GET /blog` route handler (mirrors `(de)/blog/[slug]`, `(de)/sitemap`, `(de)/popular`); `revalidate = 86400`. Statically prerendered (`○` in build). |
| `web/next.config.mjs` | `301 /blog.html → /blog` (matches the site's other 301 canonical redirects; `redirects()` run before the static file, so the old file is shadowed). |
| `web/lib/legacy-render/shell.js` | `BLOG_HREF` `/blog.html` → `/blog` (footer link on every page — avoids a self-inflicted redirect hop). |
| `web/lib/legacy-render/render-blog-post.js` | Breadcrumb JSON-LD item + German "back to blog" link → `/blog`. |
| `web/lib/legacy-render/render-sitemap.js` | HTML sitemap hub blog link → `/blog`. |
| `web/lib/sitemap-serialize.mjs` | `STATIC_PAGES`: `blog.html` → `blog` (the XML pages sitemap now lists the canonical `/blog`, not a redirecting URL). |
| `web/test/render-blog-list.test.mjs` (new) | 7 tests. |

## Deliberately unchanged
- **Article URLs** (`/blog/<slug>`), their **canonicals**, and their **hreflang**
  (`post.alternates`, P0-6) — none touched.
- The XML **article** sitemap (`sitemap-blog.xml`) — unchanged.
- No indexability/policy/route changes; the only new redirect is `/blog.html`.
- `public/blog.html` + `scripts/prerender-blog-list.mjs` are left in place; the
  file now 301s, so its build-time injection is redundant (a harmless no-op that
  can be removed in a later cleanup) — not removed here to keep this PR minimal.

## Tests / build (local)
- **P0-5 tests: 7/7 pass** (raw-HTML self-canonical `/blog`, `index,follow`,
  de + x-default self hreflang with no fake per-language listing, crawlable
  `<a href="/blog/slug">` cards + titles with no skeleton/`aria-busy`, populated
  ItemList with absolute URLs, single-post = no featured, empty-list still
  indexable, HTML escaping, blog.css + fonts + shared chrome).
- **Full frontend suite: 441/441 pass.**
- **Production build: success** — `/blog` prerendered `○ (Static)`; the built
  `blog.body` has self-canonical `/blog`, `index,follow`, hreflang de+x-default →
  `/blog`, **14 unique `/blog/<slug>` links**, ItemList, and the H1 — all in the
  raw HTML from live data at build.

## Production verification (to run after deploy)
Googlebot-UA raw HTML: `/blog` = 200 / `index,follow` / self-canonical / article
list present without JS; `/blog.html` = 301 → `/blog` (single hop, no chain);
sitemap still valid; article hreflang unchanged.

## Rollback
Revert the `next.config.mjs` redirect, the `BLOG_HREF`/breadcrumb/sitemap link
changes, and remove `app/(de)/blog/route.js` + `render-blog-list.js`. `/blog.html`
resumes serving. No data migration.
