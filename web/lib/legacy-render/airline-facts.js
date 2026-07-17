// [AIRLINE-SEO-CONTENT] Real, data-gated facts for an airline page. An airline
// "serves" both endpoints of every route it operates, so its destinations are
// the distinct cities across all route endpoints; countries likewise. Distance
// extremes come from the route-pages metadata join. Nothing is invented — a
// fact is omitted when its data is absent.
const { localizeCity, localizeCountry } = require('./data');
const { translate, format } = require('./translate');
const { pickVariant } = require('./content-variants');
const { nfmt, listSep } = require('./connection-facts');

function computeAirlineFacts(airline, routes, routeMetaBySlug, lang) {
  const meta = routeMetaBySlug || {};
  const citiesBySlug = new Map();
  const countryCounts = new Map();
  const distRoutes = [];

  for (const r of routes || []) {
    for (const side of [
      ['origin_city', 'origin_city_slug', 'origin_iata', 'origin_country'],
      ['destination_city', 'destination_city_slug', 'destination_iata', 'destination_country'],
    ]) {
      const name = r[side[0]];
      const slug = r[side[1]];
      const iata = r[side[2]];
      const country = r[side[3]];
      if (slug && !citiesBySlug.has(slug)) citiesBySlug.set(slug, { slug, iata, name: localizeCity(name, iata, lang) });
      if (country) countryCounts.set(country, (countryCounts.get(country) || 0) + 1);
    }
    const m = meta[r.slug] || {};
    if (typeof m.distance_km === 'number' && m.distance_km > 0) {
      distRoutes.push({
        label: `${localizeCity(r.origin_city, r.origin_iata, lang)} – ${localizeCity(r.destination_city, r.destination_iata, lang)}`,
        km: m.distance_km,
      });
    }
  }

  const cities = [...citiesBySlug.values()].sort((a, b) => a.name.localeCompare(b.name));
  const countries = [...countryCounts.keys()]
    .map((c) => ({ code: c, name: localizeCountry(c, c, lang), count: countryCounts.get(c) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  let distances = null;
  if (distRoutes.length) {
    const sorted = [...distRoutes].sort((a, b) => a.km - b.km);
    distances = { shortest: sorted[0], longest: sorted[sorted.length - 1] };
  }

  return {
    routeCount: (routes || []).length,
    cities,
    destinationCount: cities.length,
    countries,
    countryCount: countries.length,
    distances,
    hub: typeof airline.hubAirport === 'string' && airline.hubAirport ? airline.hubAirport : null,
  };
}

// [ANTI-BOILERPLATE] Per-airline varied, data-driven intro (same approach as
// the other entity pages), keyed on the IATA code.
function buildAirlineIntro(airline, facts, lang) {
  const seed = airline.iata_code || airline.name;
  const name = airline.name;
  const openKeys = ['airlineIntroOpenA', 'airlineIntroOpenB'];
  if (facts.routeCount > 0) openKeys.push('airlineIntroOpenC');
  const openKey = openKeys[pickVariant(`${seed}:alintroOpen`, openKeys.length)];
  let s = format(translate(openKey, lang), { airline: name, count: nfmt(facts.routeCount, lang) });
  if (facts.destinationCount > 0 && facts.countryCount > 0) {
    s += format(translate('airlineIntroData', lang), {
      airline: name,
      destinationCount: nfmt(facts.destinationCount, lang),
      countryCount: nfmt(facts.countryCount, lang),
    });
  }
  if (facts.hub) {
    s += format(translate('airlineIntroHub', lang), { airline: name, hub: facts.hub });
  }
  const closeKeys = ['airlineIntroCloseA', 'airlineIntroCloseB'];
  s += translate(closeKeys[pickVariant(`${seed}:alintroClose`, closeKeys.length)], lang);
  return s;
}

function buildAirlineFaqItems(airline, facts, lang) {
  const items = [];
  const sep = listSep(lang);
  const name = airline.name;
  const t = (key, vars) => format(translate(key, lang), Object.assign({ airline: name }, vars));

  if (facts.routeCount > 0) {
    items.push({
      question: t('airlineFaqRoutesQuestion'),
      answer: t('airlineFaqRoutesAnswer', { count: nfmt(facts.routeCount, lang), destinationCount: nfmt(facts.destinationCount, lang) }),
    });
  }
  if (facts.destinationCount > 0) {
    items.push({
      question: t('airlineFaqDestinationsQuestion'),
      answer: t('airlineFaqDestinationsAnswer', { count: nfmt(facts.destinationCount, lang), cities: facts.cities.slice(0, 6).map((c) => c.name).join(sep) }),
    });
  }
  if (facts.countryCount > 0) {
    items.push({
      question: t('airlineFaqCountriesQuestion'),
      answer: t('airlineFaqCountriesAnswer', { count: nfmt(facts.countryCount, lang), countries: facts.countries.slice(0, 10).map((c) => c.name).join(sep) }),
    });
  }
  if (facts.hub) {
    items.push({
      question: t('airlineFaqHubQuestion'),
      answer: t('airlineFaqHubAnswer', { hub: facts.hub }),
    });
  }
  if (facts.distances) {
    items.push({
      question: t('airlineFaqLongestQuestion'),
      answer: t('airlineFaqLongestAnswer', { route: facts.distances.longest.label, distance: nfmt(facts.distances.longest.km, lang) }),
    });
  }
  return items;
}

module.exports = { computeAirlineFacts, buildAirlineIntro, buildAirlineFaqItems };
