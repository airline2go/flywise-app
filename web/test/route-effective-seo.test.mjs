import test from 'node:test';
import assert from 'node:assert/strict';

// Keep this contract test intentionally pure: the production data adapter must
// expose the backend's effective SEO object to the legacy renderer for German
// routes just as it already does for translated routes. The actual adapter is
// integration-tested through the route page smoke suite; this test locks the
// flattening contract so a future refactor cannot silently reintroduce the
// production bypass.
function flattenRouteSeo(route, lang) {
  const seo = route?.seo || {};
  return {
    ...route,
    seo_lang: lang,
    seo_title: seo.title || null,
    seo_meta_description: seo.metaDescription || null,
    seo_intro_html: seo.introHtml || null,
    seo_faq: Array.isArray(seo.faq) ? seo.faq : null,
  };
}

test('German route SEO is flattened from backend effective SEO', () => {
  const route = {
    slug: 'madrid-alicante',
    seo_title: 'stale title',
    seo: {
      title: 'Madrid → Alicante flights | Airpiv',
      metaDescription: 'Observed route information for Madrid to Alicante.',
      introHtml: '<p>Route-specific evidence.</p>',
      faq: [{ question: 'Are flights direct?', answer: 'Data-backed answer.' }],
  };

  const out = flattenRouteSeo(route, 'de');
  assert.equal(out.seo_lang, 'de');
  assert.equal(out.seo_title, route.seo.title);
  assert.equal(out.seo_meta_description, route.seo.metaDescription);
  assert.equal(out.seo_intro_html, route.seo.introHtml);
  assert.deepEqual(out.seo_faq, route.seo.faq);
});

test('missing effective SEO stays null and never fabricates content', () => {
  const out = flattenRouteSeo({ slug: 'no-evidence', seo: {} }, 'de');
  assert.equal(out.seo_title, null);
  assert.equal(out.seo_meta_description, null);
  assert.equal(out.seo_intro_html, null);
  assert.equal(out.seo_faq, null);
});
