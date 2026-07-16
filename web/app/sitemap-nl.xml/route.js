// Per-language entity sitemap (sitemap-nl.xml) — replicates the old
// build-time sitemap-nl.xml. Logic lives in lib/sitemap-route.js.
import { makeSitemapRoute } from '@/lib/sitemap-route';

export const revalidate = 3600;

export const GET = makeSitemapRoute('nl');
