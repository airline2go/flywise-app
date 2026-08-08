// Tests for the read-only page SEO analyzer (Phase 3 extraction + Phase 14 score).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { analyzeRoutePage, extractSeoElements } = require('../lib/seo/analyze-page.js');

// A representative rendered route page carrying the real renderer markers.
const RICH_HTML = `<!doctype html><html lang="de"><head>
<title>Flüge von Hamburg nach Barcelona – Flugzeit & Entfernung | Airpiv</title>
<meta name="description" content="Vergleiche Live-Flugpreise, Flugzeit, Entfernung, Airlines und Direktflüge von Hamburg nach Barcelona. Jetzt Flüge auf Airpiv finden.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://airpiv.com/flights/hamburg-barcelona-2">
<link rel="alternate" hreflang="de" href="https://airpiv.com/flights/hamburg-barcelona-2">
<link rel="alternate" hreflang="en" href="https://airpiv.com/en/flights/hamburg-barcelona-2">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[]}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Flight"}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList"}</script>
</head><body>
<main id="route-main"><div id="route-content">
<nav class="breadcrumb"><a href="/country/Spain">Spain</a></nav>
<h1>Flüge von Hamburg nach Barcelona</h1>
<div style="...">📏 1.100 km · Kurzstrecke</div>
<section class="route-facts-section"><div class="route-insight-card">2h 20min</div></section>
<a class="airport-info-card" href="/airport/HAM">HAM</a>
<a class="airport-info-card" href="/airport/BCN">BCN</a>
<a class="airport-info-card" href="/airline/VY">Vueling</a>
<div class="route-faq-item"><div class="route-faq-q">Wie lange dauert der Flug?</div></div>
<div class="route-faq-item"><div class="route-faq-q">Gibt es Direktflüge?</div></div>
<p>Auf dieser Strecke gibt es Nonstop-Verbindungen.</p>
<a class="related-route-card" href="/flights/hamburg-madrid">Hamburg → Madrid</a>
<a href="/city/hamburg">Hamburg</a>
</div></main>
</body></html>`;

// A thin page missing most SEO elements.
const THIN_HTML = '<!doctype html><html><head><title>x</title></head><body><main id="route-main"><p>nothing</p></main></body></html>';

test('extractSeoElements pulls the real title/meta/H1/canonical/hreflang/schema', () => {
  const el = extractSeoElements(RICH_HTML);
  assert.match(el.title, /Hamburg nach Barcelona/);
  assert.ok(el.metaLength > 50);
  assert.equal(el.h1, 'Flüge von Hamburg nach Barcelona');
  assert.equal(el.canonical, 'https://airpiv.com/flights/hamburg-barcelona-2');
  assert.equal(el.hreflangCount, 2);
  assert.deepEqual(el.schemaTypes.sort(), ['BreadcrumbList', 'FAQPage', 'Flight']);
});

test('extractSeoElements detects content blocks and categorizes internal links', () => {
  const el = extractSeoElements(RICH_HTML);
  assert.equal(el.content.faqCount, 2);
  assert.equal(el.content.hasFlightTime, true);
  assert.equal(el.content.hasAirlines, true);
  assert.equal(el.content.hasDistance, true);
  assert.equal(el.content.hasDirectInfo, true);
  assert.equal(el.content.hasBreadcrumb, true);
  assert.equal(el.internalLinks.airport, 2);
  assert.equal(el.internalLinks.airline, 1);
  assert.ok(el.internalLinks.total >= 5);
});

test('extractSeoElements pulls real fact VALUES (distance, flight time, airlines) for grounding', () => {
  const el = extractSeoElements(RICH_HTML);
  assert.equal(el.facts.distanceKm, '1.100 km');
  assert.match(el.facts.flightTime, /^2\s*h/i);
  assert.ok(Array.isArray(el.facts.airlines) && el.facts.airlines.includes('Vueling'));
});

test('a thin page exposes no fabricated facts', () => {
  const el = extractSeoElements(THIN_HTML);
  assert.equal(el.facts.distanceKm, undefined);
  assert.equal(el.facts.flightTime, undefined);
  assert.equal(el.facts.airlines, undefined);
});

test('a rich page scores well on technical health, content, and data completeness', () => {
  const a = analyzeRoutePage({ html: RICH_HTML, slug: 'hamburg-barcelona-2', lang: 'de' });
  assert.ok(a.factors.TECHNICAL_HEALTH.score >= 80, `tech ${a.factors.TECHNICAL_HEALTH.score}`);
  assert.equal(a.factors.DATA_COMPLETENESS.score, 100);
  assert.ok(a.factors.CONTENT_MATCH.score >= 80);
});

test('GSC factors are unavailable (not zero) when no GSC row is supplied', () => {
  const a = analyzeRoutePage({ html: RICH_HTML });
  assert.equal(a.factors.QUERY_OPPORTUNITY.available, false);
  assert.equal(a.factors.QUERY_OPPORTUNITY.score, null);
  assert.equal(a.factors.CTR_OPPORTUNITY.available, false);
  assert.match(a.factors.QUERY_OPPORTUNITY.reason, /unavailable/i);
});

test('CTR opportunity fires for high impressions + good position + zero clicks', () => {
  const a = analyzeRoutePage({ html: RICH_HTML, gsc: { impressions: 116, clicks: 0, position: 9.28 } });
  assert.equal(a.factors.CTR_OPPORTUNITY.available, true);
  assert.ok(a.factors.CTR_OPPORTUNITY.score >= 55, `ctr ${a.factors.CTR_OPPORTUNITY.score}`);
  assert.ok(a.flags.some((f) => /CTR optimization/i.test(f.text)));
});

test('CTR factor stays unavailable when clicks are unknown (null), even with impressions', () => {
  const a = analyzeRoutePage({ html: RICH_HTML, gsc: { impressions: 116, clicks: null, position: 9.28 } });
  assert.equal(a.factors.CTR_OPPORTUNITY.available, false);
  assert.match(a.factors.CTR_OPPORTUNITY.reason, /clicks unavailable/i);
  // But QUERY_OPPORTUNITY still works from impressions + position.
  assert.equal(a.factors.QUERY_OPPORTUNITY.available, true);
});

test('a thin page raises the right issues and never throws', () => {
  const a = analyzeRoutePage({ html: THIN_HTML, slug: 'thin', lang: 'de' });
  const texts = a.flags.map((f) => f.text).join(' | ');
  assert.match(texts, /Missing meta description/);
  assert.match(texts, /Missing canonical/);
  assert.match(texts, /No JSON-LD structured data/);
  assert.match(texts, /No flight-time section/);
  assert.equal(a.factors.DATA_COMPLETENESS.score, 0);
});

test('overall score is the mean of available factors only', () => {
  const withGsc = analyzeRoutePage({ html: RICH_HTML, gsc: { impressions: 116, clicks: 0, position: 9.28 } });
  const noGsc = analyzeRoutePage({ html: RICH_HTML });
  assert.equal(withGsc.coverage, 6); // all six factors available
  assert.equal(noGsc.coverage, 4); // GSC-dependent two are excluded
  assert.ok(withGsc.score > 0 && noGsc.score > 0);
});

test('malformed / empty HTML is handled without throwing', () => {
  assert.doesNotThrow(() => analyzeRoutePage({ html: '' }));
  assert.doesNotThrow(() => analyzeRoutePage({ html: null }));
  assert.doesNotThrow(() => analyzeRoutePage({ html: '<title>only</title>' }));
});
