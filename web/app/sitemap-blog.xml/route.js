// Per-type entity sitemap (sitemap-blog.xml) — every blog URL in all 8
// languages. Logic lives in lib/sitemap-route.js + lib/sitemap-urls.js.
import { buildBlogUrls } from '@/lib/sitemap-urls';
import { makeTypeSitemapRoute } from '@/lib/sitemap-route';

export const revalidate = 3600;

export const GET = makeTypeSitemapRoute(buildBlogUrls);
