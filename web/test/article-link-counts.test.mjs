// Unit tests for the pure per-language article↔route link counter that backs
// the admin route list's "linked articles (versions · languages)" badge.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { articleLinkCounts } = require('../lib/article-link-counts.js');

const routes = [
  { slug: 'txl-muc', origin_city: 'Berlin', origin_iata: 'TXL', destination_city: 'München', destination_iata: 'MUC' },
  { slug: 'txl-ham', origin_city: 'Berlin', origin_iata: 'TXL', destination_city: 'Hamburg', destination_iata: 'HAM' },
  { slug: 'cdg-fco', origin_city: 'Paris', origin_iata: 'CDG', destination_city: 'Rom', destination_iata: 'FCO' },
];

// Resolver localizes a route's two cities to the requested language and
// lowercases them — "München" (de) vs "Munich" (en), "Rom" vs "Rome".
const EN = { München: 'munich', Rom: 'rome' };
const resolve = (r, lang) => {
  const norm = (c) => (lang === 'en' ? (EN[c] || c).toLowerCase() : c.toLowerCase());
  return { origin: norm(r.origin_city), dest: norm(r.destination_city) };
};

const postCitySetsByLang = {
  de: [new Set(['münchen']), new Set(['berlin'])], // 2 German posts
  en: [new Set(['munich'])], // 1 English post
};

test('counts linked articles per language, with total and language count', () => {
  const { counts, langCounts } = articleLinkCounts(routes, postCitySetsByLang, resolve);

  // txl-muc: DE 'münchen' (dest) + DE 'berlin' (origin) = 2; EN 'munich' (dest) = 1
  assert.deepEqual(langCounts['txl-muc'], { de: 2, en: 1, total: 3, langs: 2 });
  assert.equal(counts['txl-muc'], 2); // backward-compat flat count = German

  // txl-ham: only DE 'berlin' (origin) matches; no English post mentions it
  assert.deepEqual(langCounts['txl-ham'], { de: 1, en: 0, total: 1, langs: 1 });
  assert.equal(counts['txl-ham'], 1);

  // cdg-fco: nothing mentions Paris/Rome
  assert.deepEqual(langCounts['cdg-fco'], { de: 0, en: 0, total: 0, langs: 0 });
  assert.equal(counts['cdg-fco'], 0);
});

test('handles empty inputs without throwing', () => {
  assert.deepEqual(articleLinkCounts([], postCitySetsByLang, resolve), { counts: {}, langCounts: {} });
  const r = articleLinkCounts(routes, {}, resolve);
  assert.deepEqual(r.langCounts['txl-muc'], { total: 0, langs: 0 });
  assert.equal(r.counts['txl-muc'], 0);
});
