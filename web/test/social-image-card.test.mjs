// Tests the deterministic branded social-image generator: per-platform sizing,
// the no-fabricated-price rule, XML-safe interpolation, RTL for Arabic, headline
// wrapping/truncation, and a valid self-contained SVG for every combination.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const card = require('../lib/social/image-card.js');
const {
  buildImageCard, buildCardModel, wrapText, escapeXml,
  PLATFORM_DIMENSIONS, TEMPLATE_TYPES, LANGUAGES, svgToDataUri,
} = card;

test('platform dimensions drive the SVG canvas size', () => {
  const ig = buildImageCard({ type: 'flight_deal', platform: 'instagram', lang: 'en', data: { origin: 'A', destination: 'B' } });
  assert.equal(ig.width, PLATFORM_DIMENSIONS.instagram.width);
  assert.equal(ig.height, PLATFORM_DIMENSIONS.instagram.height);
  assert.match(ig.svg, /width="1080" height="1080"/);

  const fb = buildImageCard({ type: 'flight_deal', platform: 'facebook', lang: 'en', data: { origin: 'A', destination: 'B' } });
  assert.match(fb.svg, /width="1200" height="630"/);
});

test('unknown platform falls back to facebook dimensions', () => {
  const c = buildImageCard({ type: 'flight_deal', platform: 'nope', lang: 'en', data: { origin: 'A', destination: 'B' } });
  assert.equal(c.platform, 'facebook');
  assert.equal(c.width, 1200);
});

test('flight_deal draws a price badge only when a real price is supplied', () => {
  const withPrice = buildImageCard({ type: 'flight_deal', platform: 'facebook', lang: 'de', data: { origin: 'Málaga', destination: 'Ibiza', price: '39 €', directFlight: true } });
  assert.match(withPrice.svg, /39 €/);

  const noPrice = buildImageCard({ type: 'flight_deal', platform: 'facebook', lang: 'de', data: { origin: 'Málaga', destination: 'Ibiza' } });
  assert.doesNotMatch(noPrice.svg, /undefined/);
  // No currency badge and no leaked "39" price text (coordinates/"600+"
  // tagline digits are expected, so we check the actual price string, not \d).
  assert.doesNotMatch(noPrice.svg, /€|\$/);
  assert.doesNotMatch(noPrice.svg, /39/);
});

test('direct chip appears only for direct flight_deal routes', () => {
  const direct = buildCardModel({ type: 'flight_deal', platform: 'x', lang: 'en', data: { origin: 'A', destination: 'B', directFlight: true } });
  assert.equal(direct.direct, true);
  const svg = card.renderCardSVG(direct, PLATFORM_DIMENSIONS.x);
  assert.match(svg, /Direct/);

  const indirect = buildImageCard({ type: 'flight_deal', platform: 'x', lang: 'en', data: { origin: 'A', destination: 'B' } });
  assert.doesNotMatch(indirect.svg, /Direct<\/text>|✈ Direct/);
});

test('headline is the route arrow for deals, city for guides, title for blog', () => {
  assert.equal(buildCardModel({ type: 'flight_deal', platform: 'facebook', lang: 'en', data: { origin: 'Berlin', destination: 'Rome' } }).headline, 'Berlin → Rome');
  assert.equal(buildCardModel({ type: 'city_guide', platform: 'facebook', lang: 'en', data: { city: 'Ibiza', country: 'Spain' } }).headline, 'Ibiza');
  assert.equal(buildCardModel({ type: 'blog_promo', platform: 'facebook', lang: 'en', data: { title: 'Fly cheap' } }).headline, 'Fly cheap');
});

test('XML special characters in names are escaped (no broken SVG)', () => {
  // A short (non-wrapping) headline keeps the escaped text contiguous in one tspan.
  const c = buildImageCard({ type: 'city_guide', platform: 'facebook', lang: 'en', data: { city: 'A & B', country: '<"Q">' } });
  assert.match(c.svg, /A &amp; B/);
  assert.match(c.svg, /&lt;&quot;Q&quot;&gt;/);
  assert.doesNotMatch(c.svg, /A & B|<"Q">/);
});

test('Arabic renders right-to-left', () => {
  const c = buildImageCard({ type: 'city_guide', platform: 'instagram', lang: 'ar', data: { city: 'دبي', country: 'الإمارات' } });
  assert.equal(c.language, 'ar');
  assert.match(c.svg, /direction="rtl"/);
  assert.match(c.svg, /دبي/);
});

test('wrapText splits into at most maxLines and ellipsizes overflow', () => {
  assert.deepEqual(wrapText('New York', 16, 2), ['New York']);
  const two = wrapText('San Francisco International', 12, 2);
  assert.ok(two.length <= 2);
  const long = wrapText('Supercalifragilisticexpialidocious', 10, 1);
  assert.equal(long.length, 1);
  assert.ok(long[0].endsWith('…'));
  assert.ok(long[0].length <= 10);
});

test('escapeXml covers all five entities', () => {
  assert.equal(escapeXml(`&<>"'`), '&amp;&lt;&gt;&quot;&apos;');
});

test('data URI is a base64 SVG that round-trips (UTF-8 safe)', () => {
  const c = buildImageCard({ type: 'city_guide', platform: 'facebook', lang: 'ar', data: { city: 'دبي' } });
  assert.match(c.dataUri, /^data:image\/svg\+xml;base64,/);
  const b64 = c.dataUri.replace(/^data:image\/svg\+xml;base64,/, '');
  const decoded = Buffer.from(b64, 'base64').toString('utf-8');
  assert.equal(decoded, c.svg);
  assert.match(decoded, /دبي/);
});

test('filename is slug-safe and platform-prefixed', () => {
  const c = buildImageCard({ type: 'flight_deal', platform: 'instagram', lang: 'de', data: { origin: 'Málaga', destination: 'Ibiza' } });
  assert.match(c.filename, /^airpiv-instagram-/);
  assert.doesNotMatch(c.filename, /[^a-z0-9-]/);
});

test('every template × platform × language yields a valid, self-contained SVG', () => {
  for (const type of TEMPLATE_TYPES) {
    for (const platform of Object.keys(PLATFORM_DIMENSIONS)) {
      for (const lang of LANGUAGES) {
        const c = buildImageCard({
          type, platform, lang,
          data: { origin: 'A', destination: 'B', price: '10 €', directFlight: true, city: 'A', country: 'C', title: 'T', excerpt: 'E' },
        });
        assert.ok(c.svg.startsWith('<svg'), `${type}/${platform}/${lang} not an svg`);
        assert.ok(c.svg.trim().endsWith('</svg>'), `${type}/${platform}/${lang} truncated`);
        assert.doesNotMatch(c.svg, /undefined|NaN|\[object/, `${type}/${platform}/${lang} placeholder leak`);
        // Self-contained: no external references.
        assert.doesNotMatch(c.svg, /https?:\/\/(?!www\.w3\.org)/, `${type}/${platform}/${lang} external ref`);
      }
    }
  }
});
