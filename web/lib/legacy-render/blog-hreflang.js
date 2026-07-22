// [BLOG-HREFLANG-FIX] Pure computation of a blog post's hreflang alternate
// set, split out of render-blog-post.js so it can be unit-tested without
// pulling that file's node-html-parser dependency (mirrors how
// revalidate-paths.mjs keeps its pure logic testable). See the render call
// site for the reasoning; the rule in one place:
//
//   The blog is German-source with an OPTIONAL English translation
//   (post.slug_en, which lives under its OWN slug — never the German slug).
//   The other site languages have no blog at all, so they must never be
//   advertised. A German post therefore self-references (de) and adds the
//   English alternate ONLY when slug_en exists; the English page
//   self-references (en). renderShell derives x-default from the German
//   entry when present.
function blogHreflangUrls(post, isGerman, selfUrl, deUrl) {
  if (isGerman) {
    if (post && post.slug_en) {
      return { de: deUrl, en: `https://airpiv.com/en/blog/${encodeURIComponent(post.slug_en)}` };
    }
    return { de: deUrl };
  }
  return { en: selfUrl };
}

module.exports = { blogHreflangUrls };
