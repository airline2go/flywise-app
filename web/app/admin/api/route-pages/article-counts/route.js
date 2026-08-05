import { NextResponse } from 'next/server';
import { listRoutePages, listBlogPosts, listCities, listCountries } from '../../../../../lib/content-api';
import dataMod from '../../../../../lib/legacy-render/data.js';
import countsMod from '../../../../../lib/article-link-counts.js';

const { setGeoData, detectCitiesInText, slugForIata } = dataMod;
const { articleLinkCounts } = countsMod;

// [ROUTE-ARTICLE-COUNTS] For the admin route list: how many blog articles are
// linked to each route. Mirrors the route page's "Related Articles" matching
// (computeRelatedArticles in legacy-render/render.js) — a post is linked when
// its text genuinely mentions the route's origin or destination city — but
// returns the TRUE count per route (not capped at the 4 shown on the page).
//
// [ARTICLE-COUNTS-BY-LANG] The blog is German-source with an optional English
// translation (no other language blogs), so both languages are counted: German
// posts matched against German city names, English posts against English ones.
// Returns { ok, counts: { [slug]: deCount }, langCounts: { [slug]: { de, en,
// total, langs } } } — `counts` stays the German-only number for backward
// compatibility; `langCounts` adds the per-language breakdown (how many
// versions and in how many languages) the admin badge now shows.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [routes, dePosts, enPosts, cities, countries] = await Promise.all([
      listRoutePages(),
      listBlogPosts('de'),
      listBlogPosts('en'),
      listCities(),
      listCountries(),
    ]);
    setGeoData(cities, countries);

    // Each post's mentioned-city set, per language — canonical city slugs from
    // the dynamic recognizer (language-independent, accent-proof).
    const citySets = (posts) => posts.map((p) => new Set(
      detectCitiesInText(`${p.title || ''} ${(p.content || '').replace(/<[^>]+>/g, ' ')}`),
    ));
    const postCitySetsByLang = { de: citySets(dePosts), en: citySets(enPosts) };

    // A route's two cities as canonical slugs, resolved from its airport codes
    // — the same entity space the post slug sets use, so matching is exact.
    const resolveRouteCities = (r) => ({
      origin: slugForIata(r.origin_iata) || '',
      dest: slugForIata(r.destination_iata) || '',
    });

    const { counts, langCounts } = articleLinkCounts(routes, postCitySetsByLang, resolveRouteCities);
    return NextResponse.json({ ok: true, counts, langCounts });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message, counts: {}, langCounts: {} }, { status: 500 });
  }
}
