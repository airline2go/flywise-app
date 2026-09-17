
test('single-destination airport WITH admin traveler content is indexed', () => {
  const airport = { code: 'TXL', name: 'Berlin-Tegel', city: 'Berlin', city_slug: 'berlin', country: 'DE', translations: {}, terminal_info: 'Terminal A und B, fußläufig verbunden.' };
  const { html } = renderAirportPage(airport, [routeRow()], 'de', {});
  assert.equal(robotsFrom(html), 'index, follow');
});

test('airport breadcrumb uses the localized country name', () => {
  const airport = { code: 'TXL', name: 'Berlin-Tegel', city: 'Berlin', city_slug: 'berlin', country: 'DE', translations: {} };
  const { html } = renderAirportPage(airport, [routeRow()], 'de', {});
  assert.match(html, />Deutschland<\/a>/);
  assert.match(html, /"name":"Deutschland"/);
});

test('route with no real data and no admin content is noindex', () => {
  const { html } = renderFlightRoutePage(routeRow(), 'de', [], { fromOrigin: [], toDestination: [] });
  assert.equal(robotsFrom(html), 'noindex, follow');
});

test('route with distance only is noindex under enforced evidence policy', () => {
  const { html } = renderFlightRoutePage(routeRow({ distance_km: 480, haul_type: 'short-haul' }), 'de', [], { fromOrigin: [], toDestination: [] });
  assert.equal(robotsFrom(html), 'noindex, follow');
});

test('dataless route WITH an admin intro is indexed', () => {
  const { html } = renderFlightRoutePage(routeRow({ slug: 'lgw-pmi', intro_text: 'Handgeschriebene Einleitung für diese Strecke.' }), 'de', [], { fromOrigin: [], toDestination: [] });
  assert.equal(robotsFrom(html), 'index, follow');
});

test('airline count alone is insufficient evidence for indexing', () => {
  const { html } = renderFlightRoutePage(routeRow({ airline_count: 3 }), 'de', [], { fromOrigin: [], toDestination: [] });
  assert.equal(robotsFrom(html), 'noindex, follow');
});

test('route with observed airline count plus real duration is indexed', () => {
  const { html } = renderFlightRoutePage(routeRow({ slug: 'lgw-pmi', airline_count: 3, min_duration_min: 90, avg_duration_min: 120 }), 'de', [], { fromOrigin: [], toDestination: [] });
  assert.equal(robotsFrom(html), 'index, follow');
});

test('route breadcrumb does not link a destination city that has no page', () => {
  const { html } = renderFlightRoutePage(
    routeRow({ destination_iata: 'BUD', destination_city: 'Budapest', destination_city_slug: 'budapest', destination_country: 'HU' }),
    'de', [], { fromOrigin: [], toDestination: [] },
  );
  assert.doesNotMatch(html, /href="[^"]*\/city\/budapest"/);
  assert.doesNotMatch(html, /"item":"[^"]*\/city\/budapest"/);
  assert.match(html, />Budapest</);
});

test('route still links a destination city that has a real page', () => {
  const { html } = renderFlightRoutePage(routeRow({ airline_count: 3 }), 'de', [], { fromOrigin: [], toDestination: [] });
  assert.match(html, /href="[^"]*\/city\/muenchen"/);
  assert.match(html, /"item":"[^"]*\/city\/muenchen"/);
});