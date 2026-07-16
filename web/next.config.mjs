/** @type {import('next').NextConfig} */
const nextConfig = {
  // [MONOREPO] This project lives inside flywise-app/web, which sits next
  // to flywise-app's own package-lock.json — without this, Next.js can't
  // tell which lockfile is its actual workspace root.
  turbopack: {
    root: import.meta.dirname,
  },

  // [VERBATIM-HOME] The customer-facing homepage + booking/search/checkout
  // SPA is the original index.html + app.js + styles.css, served byte-for-byte
  // from public/ so it is visually and behaviourally 1:1 with production (a
  // React reimplementation drifted — proven by visual-parity/). '/' is
  // rewritten to the static /index.html in beforeFiles so it wins over any
  // app-router route. Verified 0px against the legacy home in visual-parity/.
  // The legacy index.html localizes itself from window.location.pathname
  // (app.js: '/en' -> English, '/ar' -> Arabic, …), so every language home is
  // the SAME file served under its own URL. Rewrites mask the path, so the
  // browser URL stays '/en' and app.js localizes exactly as in production.
  // Only the bare language home is rewritten — '/en/city/…' etc. still route
  // to the app-router SEO pages.
  // The bare search deep-links (/search/BER-CDG and /search/multi-city) are
  // served by the SAME original index.html on production — app.js reads the
  // pathname and auto-runs the search. `:pair` matches both the IATA pair and
  // the literal "multi-city" segment. Localized search (/en/search/…) does NOT
  // exist on production (it 404s), so only the root path is rewritten and the
  // React [lang]/search routes are removed.
  async rewrites() {
    const LANG_HOMES = ['en', 'ar', 'es', 'fr', 'it', 'nl'];
    return {
      beforeFiles: [
        { source: '/', destination: '/index.html' },
        ...LANG_HOMES.map((l) => ({ source: `/${l}`, destination: '/index.html' })),
        { source: '/search/:pair', destination: '/index.html' },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
