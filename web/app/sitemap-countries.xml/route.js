// Per-type entity sitemap (sitemap-countries.xml) — every countries URL in all 8
// languages. Logic lives in lib/sitemap-route.js + lib/sitemap-urls.js.
import { buildCountryUrls } from '@/lib/sitemap-urls';
import { makeTypeSitemapRoute } from '@/lib/sitemap-route';

// Entity sitemaps are data-driven; force fresh route execution while
// the underlying sitemap feed remains explicitly fetch-cached for 15 minutes.
export const dynamic = 'force-dynamic';

export const GET = makeTypeSitemapRoute(buildCountryUrls);
