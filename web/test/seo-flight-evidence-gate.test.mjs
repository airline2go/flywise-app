import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasManualEditorialContent, hasPersistedFlightEvidence } from '../scripts/seo-flight-evidence-gate.mjs';

test('persisted duration is sufficient evidence even when live itinerary_count is zero', () => {
  assert.equal(hasPersistedFlightEvidence({ avg_duration_min: 120, itinerary_count: 0 }), true);
  assert.equal(hasPersistedFlightEvidence({ min_duration_min: 105, itinerary_count: 0 }), true);
});

test('persisted stop distribution or price sampling is sufficient evidence', () => {
  assert.equal(hasPersistedFlightEvidence({ stop_distribution: { 0: 3, 1: 2 }, itinerary_count: 0 }), true);
  assert.equal(hasPersistedFlightEvidence({ price_sample_count: 4, itinerary_count: 0 }), true);
});

test('airline count or distance alone is not evidence', () => {
  assert.equal(hasPersistedFlightEvidence({ airline_count: 5, itinerary_count: 0 }), false);
  assert.equal(hasPersistedFlightEvidence({ distance_km: 900, itinerary_count: 0 }), false);
});

test('manual editorial content is accepted as the explicit fallback', () => {
  assert.equal(hasManualEditorialContent({ intro_text: 'Verified editorial introduction.' }), true);
  assert.equal(hasManualEditorialContent({ custom_faq: [{ question: 'Q', answer: 'A' }] }), true);
  assert.equal(hasManualEditorialContent({ intro_text: '', custom_faq: [] }), false);
});
