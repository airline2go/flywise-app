// [NEXTJS-REVALIDATE] Phase 2 of the Next.js migration — flywise-server's
// triggerRebuild() calls this on-demand whenever an admin publishes/edits/
// deletes a route page or blog post, so the specific affected pages
// refresh immediately instead of waiting for their `revalidate` window to
// lapse naturally. See the migration plan's Phase 2 section.
//
// Auth: a shared-secret Bearer token (REVALIDATE_SECRET), not a user
// session — this is a server-to-server call from flywise-server, not
// something a browser ever hits directly.
//
// The path-mapping and IndexNow-payload logic lives in
// lib/revalidate-paths.mjs (pure + unit-tested); this file owns the HTTP
// concerns: auth, calling revalidatePath(), and firing the IndexNow request.
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { LANGUAGES, pathFor } from '../../../lib/languages';
import { computeRevalidatePaths, buildIndexNowPayload } from '../../../lib/revalidate-paths.mjs';

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
  try {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(buildIndexNowPayload(paths, { origin: SITE_ORIGIN, key: INDEXNOW_KEY })),
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

  // City/country/airport/airline/route → all 7 language variants; blog → the
  // one language it was authored in. See lib/revalidate-paths.mjs.
  const uniquePaths = computeRevalidatePaths(entities, LANGUAGES, pathFor);

  // Drop the affected pages from the ISR cache so the next request rebuilds
  // them (or they rebuild in the background per revalidate).
  uniquePaths.forEach((p) => revalidatePath(p));

  // Notify IndexNow so search engines pick up the change immediately, not
  // only on the next crawl. Awaited but non-fatal (see pingIndexNow).
  await pingIndexNow(uniquePaths);

  return NextResponse.json({ revalidated: true, paths: uniquePaths, indexNowNotified: uniquePaths.length });
}
