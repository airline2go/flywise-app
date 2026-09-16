// ─── #5 Flight-route thin-content noindex guard ───────────────────────────
test('route with no real data and no admin content is noindex', () => {
  const { html } = renderFlightRoutePage(routeRow(), 'de', [], { fromOrigin: [], toDestination: [] });
  assert.equal(robotsFrom(html), 'noindex, follow');
});

test('route with distance only is noindex under enforced evidence policy', () => {
  const { html } = renderFlightRoutePage(routeRow({ distance_km: 480, haul_type: 'short-haul' }), 'de', [], { fromOrigin: [], toDestination: [] });
  assert.equal(robotsFrom(html), 'noindex, follow');
});

test('dataless route WITH an admin intro is indexed', () => {
  const { html } = renderFlightRoutePage(routeRow({ intro_text: 'Handgeschriebene Einleitung für diese Strecke.' }), 'de', [], { fromOrigin: [], toDestination: [] });
  assert.equal(robotsFrom(html), 'index, follow');
});

test('route with observed airlines is indexed', () => {
  const { html } = renderFlightRoutePage(routeRow({ airline_count: 3 }), 'de', [], { fromOrigin: [], toDestination: [] });
  assert.equal(robotsFrom(html), 'index, follow');
});
