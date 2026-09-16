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
      {
        source: '/blog.html',
        destination: '/blog',
        statusCode: 301,
      },
      {
        source: '/de',
        destination: '/',
        statusCode: 301,
      },
    ];
  },

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
