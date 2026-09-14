import assert from 'node:assert/strict';
import { computeRelatedRoutes } from './related-routes.js';

const route = {
  slug: 'berlin-to-london',
  origin_city: 'Berlin',
  destination_city: 'London',
  destination_country: 'GB',
};

const routes = [
  route,
  { slug: 'berlin-to-paris', origin_city: 'Berlin', destination_city: 'Paris', destination_country: 'FR', route_score: 80 },
  { slug: 'berlin-to-paris-orly', origin_city: 'Berlin', destination_city: 'Paris', destination_country: 'FR', route_score: 70 },
  { slug: 'berlin-to-madrid', origin_city: 'Berlin', destination_city: 'Madrid', destination_country: 'ES', route_score: 60 },
  { slug: 'munich-to-london', origin_city: 'Munich', destination_city: 'London', destination_country: 'GB', route_score: 90 },
  { slug: 'london-to-berlin', origin_city: 'London', destination_city: 'Berlin', destination_country: 'DE', route_score: 100 },
];

const related = computeRelatedRoutes(route, routes);

assert.equal(related.length, 3);
assert.deepEqual(
  related.map((r) => `${r.origin_city}->${r.destination_city}`),
  ['Berlin->Paris', 'Munich->London', 'Berlin->Madrid'],
);
assert.equal(new Set(related.map((r) => `${r.origin_city}->${r.destination_city}`)).size, related.length);
