/** @type {import('next').NextConfig} */
const nextConfig = {
  // [MONOREPO] This project lives inside flywise-app/web, which sits next
  // to flywise-app's own package-lock.json — without this, Next.js can't
  // tell which lockfile is its actual workspace root.
  turbopack: {
    root: import.meta.dirname,
  },

  // [CANONICAL-DOMAIN] https://airpiv.com (bare apex) is the ONE canonical
  // host — every other spelling must 301 onto it so search engines index a
  // single origin. Vercel already force-redirects http -> https at the edge
  // for every attached domain, so the http://airpiv.com case is covered by
  // the platform. The one collapse we own in-app is the `www` host onto the
  // apex, which also finishes the http://www.airpiv.com chain (edge upgrades
  // it to https://www.airpiv.com, then this rule drops the www).
  //   statusCode: 301 — deliberately NOT `permanent: true`, which emits a 308.
  //   The SEO spec calls for a literal 301, and Google treats 301 as the
  //   canonical permanent signal, so we pin the exact code.
  //   source '/:path*' + destination '.../:path*' preserves the full path;
  //   Next.js forwards the query string automatically.
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.airpiv.com' }],
        destination: 'https://airpiv.com/:path*',
        statusCode: 301,
      },
    ];
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
    const LANG_HOMES = ['en', 'ar', 'es', 'fr', 'it', 'nl', 'tr'];
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

  // [ASSET-CACHING] These rules target root-level static public/ assets only:
  // `:file` matches a single path segment, so /_next/* (which Next already
  // fingerprints + serves immutable) and the HTML pages are untouched.
  //
  // Images/fonts never change once shipped → 1 year immutable.
  //
  // CSS/JS live at FIXED, unhashed paths (/styles.css, /app.js, …) so a URL
  // never changes when its content does. A positive max-age therefore risks
  // serving a stale stylesheet/script alongside a freshly-updated (no-cache)
  // index.html — the skew that repeatedly hid CSS fixes from users. We serve
  // them `no-cache` (store, but always revalidate before use): every load
  // sends a conditional request and Vercel answers 304 when unchanged (tiny,
  // keeps repeat views fast) or 200 with the new file the instant it changes,
  // so any deploy reaches users immediately with no stale window.
  async headers() {
    return [
      // [SECURITY-HEADERS] Applied to every response. The customer SPA
      // (public/index.html) already ships a detailed page-level CSP via a
      // <meta http-equiv> tag; `frame-ancestors` is deliberately NOT set
      // there because the directive is ignored inside a <meta> CSP and only
      // takes effect as a real response header — so the clickjacking
      // protection for the checkout/confirmation pages has to live here.
      // These are all additive, non-breaking headers (no default-src that
      // could block the SPA's own inline/vendor scripts — that stays owned
      // by the page-level meta CSP).
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
        ],
      },
      {
        source: '/:file(.*\\.(?:png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|otf))',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/:file(.*\\.(?:css|js|mjs))',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
      },
    ];
  },
};

export default nextConfig;
