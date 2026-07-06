# Airpiv App

The static frontend for the Airpiv flight-booking platform — plain HTML/CSS/JS, no build step, no bundler. Served directly as static files.

## Structure

- **`index.html` + `app.js` + `styles.css`** — the main booking app (search, results, checkout, order tracking, loyalty, referrals). `app.js` talks to the backend (`flywise-server`) and to Supabase Auth directly from the browser.
- **`admin.html` + `admin.js` + `admin.css`** — an internal admin dashboard (not linked from any page, disallowed in `robots.txt`, gated by an admin bearer token). Talks only to the backend's `/admin/*` API, never to Supabase directly.
- **`config.js`** — the one place the public Supabase URL and publishable anon key are defined (`window.APP_CONFIG`); loaded before `app.js`.
- **`analytics.js`** — the shared Google Analytics 4 bootstrap, loaded by every page.
- **Content pages** (`about.html`, `contact.html`, `blog*.html`, `airport*.html`, `city*.html`, `country*.html`, `flight-route*.html`, `cheap-flights.html`, `last-minute-flights.html`, `privacy.html`, `terms.html`, `404.html`) — static SEO content, mostly German with `-en` English counterparts, sharing `shared-layout.css` for header/footer/typography.
- **`css-tokens.css`** — the color/radius design tokens shared by `styles.css` (index.html) and `shared-layout.css` (content pages), so the two stylesheets can't silently drift out of sync.
- **Per-section stylesheets** (`blog.css`, `flight-route.css`, `blog-post.css`, `flights-promo.css`) — styling shared by a page's DE/EN pair (or by `cheap-flights.html`/`last-minute-flights.html`), extracted out of what used to be duplicated inline `<style>` blocks.

## Local development

No build step — just serve the directory:

```bash
npx http-server .
# or
python3 -m http.server 8000
```

Then open `index.html` (or any other page) in a browser.

## Formatting

CSS files are formatted with [Prettier](https://prettier.io):

```bash
npm install
npm run format
```

This only touches `*.css` — `app.js`/`admin.js` are left as-is (see their own history for why: they're hand-compacted rather than build-tool-minified, and reformatting them isn't a safe mechanical operation the way it is for the CSS).

## CI

`.github/workflows/ci.yml` runs on every push/PR to `main`:
- `node --check` on `app.js`, `admin.js`, `config.js`, `analytics.js`
- Parses every inline `<script>` block across all HTML pages to catch a syntax error before it reaches production

## Known gaps (intentionally not fixed here)

- **`airport*.html`/`city*.html`/`country*.html`** (and their `-en` counterparts) share an obvious template pattern but are not byte-identical, so they haven't been merged into a single templated page — doing that safely needs a real templating/SSG approach (e.g. Astro, 11ty), which is a bigger architectural change than this codebase's current no-build-step setup.
- **CSP** in `index.html` includes `'unsafe-inline'` in `script-src`, which weakens XSS protection. Removing it would require converting every inline `onclick="..."` handler across the site to `addEventListener`-based wiring — a real behavior-affecting change, not a cleanup.
- **`admin.html`** is protected only by URL obscurity + a bearer token, not IP allowlisting or 2FA.

## Deployment

Deployed as static files; hosting/CDN configuration lives outside this repository.
