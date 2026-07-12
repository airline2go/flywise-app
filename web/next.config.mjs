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
  async rewrites() {
    return {
      beforeFiles: [{ source: '/', destination: '/index.html' }],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
