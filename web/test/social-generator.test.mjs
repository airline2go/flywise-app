// Tests the template-driven social-post generator: hashtagizing, hashtag
// budget/dedupe, UTM CTA links, per-platform length limits, and the
// no-fabricated-price rule.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const gen = require('../lib/social/generator.js');
const { hashtagize, buildHashtags, buildCtaUrl, generateSocialPost, PLATFORMS } = gen;

test('hashtagize folds accents, spaces and punctuation', () => {
  assert.equal(hashtagize('São Paulo'), '#SaoPaulo');
  assert.equal(hashtagize('Málaga'), '#Malaga');
  assert.equal(hashtagize('New York'), '#NewYork');
  assert.equal(hashtagize('Köln'), '#Koln');
});

test('buildHashtags dedupes, pads with generic tags, and caps at the budget', () => {
  const tags = buildHashtags(['Málaga', 'Ibiza', 'Málaga'], 'en', 4);
  assert.equal(tags.length, 4);
  assert.deepEqual(tags.slice(0, 2), ['#Malaga', '#Ibiza']); // entity tags first, deduped
  assert.ok(tags.includes('#Airpiv')); // padded with brand/travel tags
});

test('buildCtaUrl mirrors site routing and adds campaign UTM params', () => {
  const de = new URL(buildCtaUrl({ type: 'route', slug: 'malaga-ibiza' }, 'de', 'facebook', 'flight_deal'));
  assert.equal(de.pathname, '/flights/malaga-ibiza'); // German unprefixed
  assert.equal(de.searchParams.get('utm_source'), 'facebook');
  assert.equal(de.searchParams.get('utm_medium'), 'social');
  assert.equal(de.searchParams.get('utm_campaign'), 'flight_deal');
  assert.equal(de.searchParams.get('utm_content'), 'de');

  const en = new URL(buildCtaUrl({ type: 'city', slug: 'ibiza' }, 'en', 'x', 'city_guide'));
  assert.equal(en.pathname, '/en/city/ibiza'); // non-German prefixed
});

test('flight_deal includes a price only when one is supplied (no fabrication)', () => {
  const withPrice = generateSocialPost({
    type: 'flight_deal', platform: 'facebook', lang: 'de',
    subject: { type: 'route', slug: 'malaga-ibiza' },
    data: { origin: 'Málaga', destination: 'Ibiza', price: '39 €', directFlight: true, entities: ['Málaga', 'Ibiza'] },
  });
  assert.match(withPrice.body, /ab 39 €/);
  assert.match(withPrice.body, /Direktflüge verfügbar/);
  assert.match(withPrice.ctaUrl, /utm_source=facebook/);
  assert.ok(withPrice.hashtags.includes('#Malaga') && withPrice.hashtags.includes('#Ibiza'));

  const noPrice = generateSocialPost({
    type: 'flight_deal', platform: 'facebook', lang: 'de',
    subject: { type: 'route', slug: 'malaga-ibiza' },
    data: { origin: 'Málaga', destination: 'Ibiza', entities: ['Málaga', 'Ibiza'] },
  });
  assert.doesNotMatch(noPrice.body, /ab \d/); // no invented number
  assert.doesNotMatch(noPrice.body, /undefined/);
});

test('X posts stay within the 280-char limit (link dropped/truncated as needed)', () => {
  const post = generateSocialPost({
    type: 'flight_deal', platform: 'x', lang: 'en',
    subject: { type: 'route', slug: 'berlin-new-york' },
    data: { origin: 'Berlin', destination: 'New York', price: '$299', directFlight: true, entities: ['Berlin', 'New York'] },
  });
  assert.ok(post.charCount <= PLATFORMS.x.maxLen, `X post ${post.charCount} > 280`);
  assert.equal(post.withinLimit, true);
});

test('Instagram keeps the link out of the body (bio link) but still returns the UTM url', () => {
  const post = generateSocialPost({
    type: 'city_guide', platform: 'instagram', lang: 'en',
    subject: { type: 'city', slug: 'ibiza' },
    data: { city: 'Ibiza', country: 'Spain', entities: ['Ibiza', 'Spain'] },
  });
  assert.doesNotMatch(post.body, /https?:\/\//); // no raw link in body
  assert.match(post.ctaUrl, /^https:\/\/airpiv\.com\/en\/city\/ibiza\?/);
  assert.ok(post.hashtags.length >= 3);
});

test('blog_promo builds from title/excerpt and links to the article', () => {
  const post = generateSocialPost({
    type: 'blog_promo', platform: 'linkedin', lang: 'en',
    subject: { type: 'blog', slug: 'cheap-flights-guide' },
    data: { title: 'How to fly cheap in 2026', excerpt: 'The full playbook.', entities: [] },
  });
  assert.match(post.body, /How to fly cheap in 2026/);
  assert.match(post.ctaUrl, /\/en\/blog\/cheap-flights-guide\?/);
  assert.equal(post.withinLimit, true);
});

test('every template type × platform × language produces valid within-limit output', () => {
  for (const type of gen.TEMPLATE_TYPES) {
    for (const platform of Object.keys(PLATFORMS)) {
      for (const lang of gen.LANGUAGES) {
        const post = generateSocialPost({
          type, platform, lang,
          subject: { type: 'route', slug: 'a-b' },
          data: { origin: 'A', destination: 'B', city: 'A', country: 'C', title: 'T', excerpt: 'E', entities: ['A'] },
        });
        assert.ok(post.body && post.body.length > 0, `${type}/${platform}/${lang} empty`);
        assert.doesNotMatch(post.body, /undefined|\[object/);
        assert.equal(post.withinLimit, true, `${type}/${platform}/${lang} over limit (${post.charCount})`);
      }
    }
  }
});
