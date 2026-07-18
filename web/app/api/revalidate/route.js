// [NEXTJS-REVALIDATE] Phase 2 of the Next.js migration — flywise-server's
// triggerRebuild() calls this on-demand whenever an admin publishes/edits/
// deletes a route page or blog post, so the specific affected pages
// refresh immediately instead of waiting for their `revalidate: 3600`
// window to lapse naturally. See the migration plan's Phase 2 section.
//
// Auth: a shared-secret Bearer token (REVALIDATE_SECRET), not a user
// session — this is a server-to-server call from flywise-server, not
// something a browser ever hits directly.
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { LANGUAGES, pathFor } from '../../../lib/languages';

// Maps an entity `type` (as used by flywise-server's admin routes) to the
// URL segment its pages live under — matches the folder names under
// app/(de)/ and app/[lang]/.
const BASE_PATH = {
  city: 'city',
  country: 'country',
  airport: 'airport',
  airline: 'airline',
  route: 'flights',
  blog: 'blog',
};

// [INDEXNOW] Public site origin + IndexNow key. The key is intentionally
// public — ownership is proven by hosting the same value at
// /{key}.txt (see public/a47b14935285b55b6ce1f3786e81262f.txt). Pinging
// IndexNow tells participating search engines (Bing, Yandex, …) about a
// changed URL immediately, instead of waiting for the next organic crawl.
const SITE_ORIGIN = 'https://airpiv.com';
const INDEXNOW_KEY = 'a47b14935285b55b6ce1f3786e81262f';

// Fire an IndexNow submission for the given absolute paths. Best-effort:
// awaited so the serverless function doesn't get frozen before the request
// leaves, but any failure is swallowed so it can never break revalidation.
async function pingIndexNow(paths) {
  if (!paths.length) return;
  const urlList = paths.map((p) => `${SITE_ORIGIN}${p}`);
  try {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: 'airpiv.com',
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
    });
  } catch {
    // best-effort: indexing notification must never fail the revalidation
  }
}

export async function POST(request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json({ revalidated: false, error: 'REVALIDATE_SECRET not configured' }, { status: 500 });
  }
  const auth = request.headers.get('authorization') || '';
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ revalidated: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const entities = body && Array.isArray(body.entities) ? body.entities : [];

  const paths = [];
  for (const entity of entities) {
    if (!entity || typeof entity.slug !== 'string' || !entity.slug) continue;
    const base = BASE_PATH[entity.type];
    if (!base) continue;
    if (entity.type === 'blog') {
      // [BLOG-STAYS-DE-EN] Blog posts carry an independent slug per
      // language (slug/slug_en), not one shared slug across all 7 —
      // revalidate only the language the caller actually told us about.
      const lang = entity.lang === 'en' ? 'en' : 'de';
      paths.push(pathFor(lang, `${base}/${entity.slug}`));
    } else {
      // City/country/airport/airline/route pages share one slug across
      // all 7 languages (only the URL prefix differs) — revalidate every
      // language variant.
      LANGUAGES.forEach((l) => paths.push(pathFor(l.code, `${base}/${entity.slug}`)));
    }
  }

  const uniquePaths = [...new Set(paths)];
  uniquePaths.forEach((p) => revalidatePath(p));

  // Notify IndexNow so search engines pick up the change immediately, not
  // only on the next crawl. Awaited but non-fatal (see pingIndexNow).
  await pingIndexNow(uniquePaths);

  return NextResponse.json({ revalidated: true, paths: uniquePaths, indexNowNotified: uniquePaths.length });
}
