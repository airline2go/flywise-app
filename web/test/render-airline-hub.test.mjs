// [HUB-PROVENANCE] An airline's hub may be asserted as fact ONLY when it is
// admin-verified (airlines.hub_iata → hubSource 'admin'). The server also
// returns an INFERRED top airport (the most frequent IATA across observed
// routes), which is catalogue-biased and often wrong (KLM inferred as FRA not
// AMS, Air Transat as LAX not YUL). It must never appear as the airline's hub —
// not in the intro sentence, not in the hub FAQ (which feeds FAQPage JSON-LD),
// only under an honest "most-served on our routes" label.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { computeAirlineFacts, buildAirlineIntro, buildAirlineFaqItems } = require('../lib/legacy-render/airline-facts.js');

const ROUTES = [
  { origin_iata: 'AMS', destination_iata: 'CDG', origin_city: 'Amsterdam', destination_city: 'Paris', origin_country: 'NL', destination_country: 'FR' },
  { origin_iata: 'AMS', destination_iata: 'FRA', origin_city: 'Amsterdam', destination_city: 'Frankfurt', origin_country: 'NL', destination_country: 'DE' },
];
const hasHubFaq = (faq) => faq.some((f) => /hub|مركز|Drehkreuz/i.test(f.question));

test('an INFERRED hub is never asserted as the airline hub (no fact claim)', () => {
  const airline = { iata_code: 'KL', name: 'KLM', hubAirport: 'FRA' }; // no hubSource → inferred
  const facts = computeAirlineFacts(airline, ROUTES, {}, 'en');
  assert.equal(facts.hub, null, 'inferred hub must not populate facts.hub');
  assert.equal(facts.topAirport, 'FRA', 'inferred value is kept as the honest top airport');
  assert.equal(hasHubFaq(buildAirlineFaqItems(airline, facts, 'en')), false, 'no hub FAQ for an inferred hub');
  assert.ok(!/main hub/i.test(buildAirlineIntro(airline, facts, 'en')), 'intro must not claim a main hub');
});

test('an explicit inferred hubSource is treated the same as a missing one', () => {
  const airline = { iata_code: 'TS', name: 'Air Transat', hubAirport: 'LAX', hubSource: 'inferred' };
  const facts = computeAirlineFacts(airline, ROUTES, {}, 'en');
  assert.equal(facts.hub, null);
  assert.equal(facts.topAirport, 'LAX');
});

test('an ADMIN-VERIFIED hub IS asserted as fact (intro + FAQ)', () => {
  const airline = { iata_code: 'KL', name: 'KLM', hubAirport: 'AMS', hubSource: 'admin' };
  const facts = computeAirlineFacts(airline, ROUTES, {}, 'en');
  assert.equal(facts.hub, 'AMS');
  assert.equal(facts.topAirport, null, 'a verified hub is not also a "top airport"');
  assert.equal(hasHubFaq(buildAirlineFaqItems(airline, facts, 'en')), true);
  assert.ok(/main hub/i.test(buildAirlineIntro(airline, facts, 'en')));
});

test('no hub and no observations → neither hub nor topAirport', () => {
  const airline = { iata_code: 'XX', name: 'Nowhere Air' }; // no hubAirport at all
  const facts = computeAirlineFacts(airline, ROUTES, {}, 'en');
  assert.equal(facts.hub, null);
  assert.equal(facts.topAirport, null);
});

test('both hub labels exist in every language (parity for the new key)', () => {
  const langs = ['ar', 'en', 'de', 'es', 'fr', 'it', 'nl', 'tr'];
  for (const l of langs) {
    const t = require(`../translations/${l}.json`);
    assert.ok(t.airlineHubLabel && t.airlineTopAirportLabel, `missing hub labels in ${l}`);
  }
});
