'use strict';

// [ARTICLE-LINK-COUNTS] Pure counting of how many blog articles link to each
// route, broken down by language. The blog is German-source with an optional
// English translation (no other language blogs), so `postCitySetsByLang`
// carries at most { de, en }. A post is "linked" to a route when the set of
// cities its text mentions (already lowercased) contains the route's origin or
// destination city — the exact rule the route page's related-articles section
// uses — matched in the post's own language so English posts match English
// city names ("Munich") and German posts match German ones ("München").
//
// Returns, per route slug, an entry in `langCounts`:
//   { <lang>: n, …, total, langs }
// where `total` is the article count across all languages and `langs` is how
// many languages have at least one linked article. Also returns a flat
// `counts` map (the German count) so existing callers that read a single
// number keep working unchanged.
//
// Kept pure (no I/O, no geo lookups) so it is unit-testable in isolation; the
// caller supplies the already-computed per-post city sets and a resolver that
// localizes a route's two cities for a given language.
function articleLinkCounts(routes, postCitySetsByLang, resolveRouteCities) {
  const langs = Object.keys(postCitySetsByLang || {});
  const counts = {};
  const langCounts = {};
  for (const r of routes || []) {
    const per = {};
    let total = 0;
    let langsWithArticles = 0;
    for (const lang of langs) {
      const sets = postCitySetsByLang[lang] || [];
      const cities = resolveRouteCities(r, lang) || {};
      const origin = cities.origin || '';
      const dest = cities.dest || '';
      let n = 0;
      for (const cs of sets) {
        if ((origin && cs.has(origin)) || (dest && cs.has(dest))) n++;
      }
      per[lang] = n;
      total += n;
      if (n > 0) langsWithArticles++;
    }
    langCounts[r.slug] = Object.assign({}, per, { total, langs: langsWithArticles });
    counts[r.slug] = per.de || 0;
  }
  return { counts, langCounts };
}

module.exports = { articleLinkCounts };
