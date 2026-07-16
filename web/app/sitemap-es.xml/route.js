// Per-language entity sitemap (sitemap-es.xml) — replicates the old
// build-time sitemap-es.xml. Logic lives in lib/sitemap-route.js.
import { makeSitemapRoute } from '@/lib/sitemap-route';

export const revalidate = 3600;

export const GET = makeSitemapRoute('es');
