import { NextResponse } from 'next/server';
import { listRoutePages, listBlogPosts, listCities, listCountries } from '../../../../../lib/content-api';
import dataMod from '../../../../../lib/legacy-render/data.js';

const { setGeoData, detectCitiesInText, localizeCity } = dataMod;

// [ROUTE-ARTICLE-COUNTS] For the admin route list: how many blog articles are
// linked to each route. Mirrors the route page's "Related Articles" matching
// (computeRelatedArticles in legacy-render/render.js) — a post is linked when
// its text genuinely mentions the route's origin or destination city — but
// returns the TRUE count per route (not capped at the 4 shown on the page).
// German source (the admin's canonical routes + the base blog), like the
// unprefixed /flights/... pages. Returns { ok, counts: { [slug]: number } }.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [routes, posts, cities, countries] = await Promise.all([
      listRoutePages(),
      listBlogPosts('de'),
      listCities(),
      listCountries(),
    ]);
    setGeoData(cities, countries);

    // Each post's mentioned-city set, computed once (lowercased for matching).
    const postCitySets = posts.map((p) => new Set(
      detectCitiesInText(`${p.title || ''} ${(p.content || '').replace(/<[^>]+>/g, ' ')}`).map((c) => c.toLowerCase()),
    ));

    const counts = {};
    for (const r of routes) {
      const origin = String(localizeCity(r.origin_city, r.origin_iata, 'de') || '').toLowerCase();
      const dest = String(localizeCity(r.destination_city, r.destination_iata, 'de') || '').toLowerCase();
      let n = 0;
      for (const cs of postCitySets) if (cs.has(origin) || cs.has(dest)) n++;
      counts[r.slug] = n;
    }

    return NextResponse.json({ ok: true, counts });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message, counts: {} }, { status: 500 });
  }
}
