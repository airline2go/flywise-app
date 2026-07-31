// Per-type sitemap (sitemap-pages.xml) — the fixed public static pages
// (home + marketing + legal). Generated from the code-defined list in
// sitemap-urls.js (buildPageUrls), replacing the old hand-maintained
// public/sitemap-pages.xml. Logic lives in lib/sitemap-route.js.
import { buildPageUrls } from '@/lib/sitemap-urls';
import { makeTypeSitemapRoute } from '@/lib/sitemap-route';

export const revalidate = 3600;

export const GET = makeTypeSitemapRoute(buildPageUrls);
