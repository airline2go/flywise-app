// [P0-6] Pure computation of a blog post's hreflang alternate set from the
// post's ACTUAL published siblings, split out of render-blog-post.js so it can
// be unit-tested without that file's node-html-parser dependency.
//
// The rule, in one place:
//   • The backend now returns `post.alternates` = [{language, slug}] listing the
//     German source plus every language that truly has a published translation
//     of THIS post (via post_id), plus legacy inline English (slug_en) when set.
//   • We emit one hreflang entry per real alternate, each at its own
//     per-language slug — so entries are reciprocal and never point at a 404.
//   • A language with no alternate is NEVER advertised.
//   • x-default is derived by renderShell from the German (default) entry, which
//     is always present because German is the source — so x-default is stable
//     and never a random current-language URL.
//
// `urlFor(langCode, relativePath)` is injected (kept out of this pure module) so
// the function stays testable with plain `node --test`.
function blogHreflangUrls(alternates, urlFor) {
  const out = {};
  for (const a of alternates || []) {
    if (!a || !a.language || !a.slug) continue;
    if (out[a.language]) continue; // first wins; never duplicate a language
    out[a.language] = urlFor(a.language, `blog/${encodeURIComponent(a.slug)}`);
  }
  return out;
}

module.exports = { blogHreflangUrls };
