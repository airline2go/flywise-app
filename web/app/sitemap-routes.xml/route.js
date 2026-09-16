// Per-type entity sitemap (sitemap-routes.xml) — every routes URL in all 8
// languages. Logic lives in lib/sitemap-route.js + lib/sitemap-urls.js.
import { buildRouteUrls } from '@/lib/sitemap-urls';
import { makeTypeSitemapRoute } from '@/lib/sitemap-route';

export const revalidate = 900;

export const GET = makeTypeSitemapRoute(buildRouteUrls);
