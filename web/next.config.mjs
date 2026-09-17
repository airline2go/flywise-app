/** @type {import('next').NextConfig} */
const nextConfig = {
  // [CANONICAL-DOMAIN] https://airpiv.com (bare apex) is the ONE canonical
  // host — every other spelling must 301 onto it so search engines index a
  // single origin. Vercel already force-redirects http -> https at the edge
  // for every attached domain, so the http://airpiv.com case is covered by
  // the platform. The one collapse we own in-app is the `www` host onto the
  // apex, which also finishes the http://www.airpiv.com chain (edge upgrades
  // it to https://www.airpiv.com, then this rule drops the www).
  //   statusCode: 301 — deliberately NOT `permanent: true`, which emits a 308.
  //   The SEO spec calls for a literal 301, and we pin the exact code.
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.airpiv.com' }],
        destination: 'https://airpiv.com/:path*',
        statusCode: 301,
      },
      // [LEGACY-SEO-PATHS] These plural paths belonged to the backend/content
      // API naming scheme and leaked into historical crawler links/logs, while
      // the public SEO routes are singular. Redirect instead of returning a
      // hard 404 so any old inbound signal is consolidated onto the real page.
      {
        source: '/airports/:code',
        destination: '/airport/:code',
        statusCode: 301,
      },
      {
        source: '/airlines/:code',
        destination: '/airline/:code',
        statusCode: 301,
      },
      {
        source: '/cities/:slug',
        destination: '/city/:slug',
        statusCode: 301,
      },
      {
        source: '/route-pages/:slug',
        destination: '/flights/:slug',
        statusCode: 301,
      },
      // Localized versions of the same retired path family.
      ...['en', 'ar', 'es', 'fr', 'it', 'nl', 'tr'].flatMap((lang) => [
        { source: `/${lang}/airports/:code`, destination: `/${lang}/airport/:code`, statusCode: 301 },
        { source: `/${lang}/airlines/:code`, destination: `/${lang}/airline/:code`, statusCode: 301 },
        { source: `/${lang}/cities/:slug`, destination: `/${lang}/city/:slug`, statusCode: 301 },
        { source: `/${lang}/route-pages/:slug`, destination: `/${lang}/flights/:slug`, statusCode: 301 },
      ]),
      // [LEGACY-SEO-ROUTE-404S] Historical route slugs still requested by Google.
      // The exact flight search remains available through the canonical search URL.
      { source: '/flights/brussels-erfurt', destination: '/search/BRU-ERF', statusCode: 301 },
      { source: '/flights/dwc-bru', destination: '/search/DWC-BRU', statusCode: 301 },
      { source: '/flights/pmi-dwc', destination: '/search/PMI-DWC', statusCode: 301 },
      ...['en', 'ar', 'es', 'fr', 'it', 'nl', 'tr'].flatMap((lang) => [
        { source: `/${lang}/flights/dwc-bru`, destination: '/search/DWC-BRU', statusCode: 301 },
        { source: `/${lang}/flights/pmi-dwc`, destination: '/search/PMI-DWC', statusCode: 301 },
      ]),
      // [P0-5 Option A] The blog listing moved from the static public/blog.html
      // to a server-rendered /blog (crawlable article links in the raw HTML).
      {
        source: '/blog.html',
        destination: '/blog',
        statusCode: 301,
      },
      // German has ONE URL: the bare root /. The former distinct /de home is
      // retired and consolidates onto the canonical root.
      {
        source: '/de',
        destination: '/',
        statusCode: 301,
      },
    ];
  },

  // [VERBATIM-HOME] The customer-facing homepage + booking/search/checkout
  // SPA is the original index.html + app.js + styles.css, served byte-for-byte
  // from public/ so it is visually and behaviourally 1:1 with production.
  async rewrites() {
    const LANG_HOMES = ['en', 'ar', 'es', 'fr', 'it', 'nl', 'tr'];
    return {
      beforeFiles: [
        { source: '/', destination: '/index.html' },
        ...LANG_HOMES.map((l) => ({ source: `/${l}`, destination: `/${l}.html` })),
        { source: '/search/:pair', destination: '/index.html' },
      ],
      afterFiles: [],
      fallback: [],
    };
  },

  // [ASSET-CACHING] Root-level public assets: immutable for images/fonts,
  // always revalidate for fixed-path CSS/JS.
  async headers() {
    return [
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
