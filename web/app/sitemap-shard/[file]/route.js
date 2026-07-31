// Overflow shard route — serves shards 2..N of any type that outgrows a single
// 50k-URL / 50MB file, at /sitemap-shard/<type>-<n>.xml (n ≥ 2). Shard 1 keeps
// the flat /sitemap-<type>.xml name (the per-type root routes); this handles the
// rest so the architecture scales to hundreds of thousands of URLs with no new
// route files. The index (buildSitemapIndex) only ever references shards that
// exist, so these URLs are reached only when real.
//
// Mounted under the static `sitemap-shard` segment because Next can't put a
// partially-dynamic segment (`sitemap-<type>-[n].xml`) at the app root, and the
// root already owns a [lang] dynamic segment.
import { SITEMAP_BUILDERS, urlsetXml, chunkUrls } from '@/lib/sitemap-urls';

export const revalidate = 3600;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

function notFound() {
  return new Response('Not found', { status: 404 });
}

export async function GET(_req, { params }) {
  const { file } = await params;
  const match = /^([a-z]+)-(\d+)\.xml$/.exec(file || '');
  if (!match) return notFound();
  const type = match[1];
  const shard = parseInt(match[2], 10);
  const build = SITEMAP_BUILDERS[type];
  // Shard 1 is the flat /sitemap-<type>.xml route, never served from here.
  if (!build || shard < 2) return notFound();

  const chunks = chunkUrls(await build());
  const chunk = chunks[shard - 1];
  if (!chunk) return notFound();

  return new Response(urlsetXml(chunk), {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
