// [COUNTRY-SEO-CONTENT] Real, data-gated facts for a country page. A country
// is different from a city/airport (it has many in-country airports rather
// than one self-node), so it can't use summarizeConnections directly; this
// computes the country-specific view: which cities/airports it contains, which
// external destinations and countries it reaches, its domestic vs
// international split, distance extremes, and a popularity-ranked destination
// list. Route metadata (distance/airline_count/route_score) is joined from the
// full route-pages list. Nothing is invented — a fact is omitted when its data
// is absent.
const { localizeCity, localizeCountry, slugForIata } = require('./data');
const { translate, format } = require('./translate');
const { pickVariant } = require('./content-variants');
const { nfmt, listSep } = require('./connection-facts');

function computeCountryFacts(country, routes, routeMetaBySlug, lang) {
  const code = country.code;
  const meta = routeMetaBySlug || {};

  const citiesBySlug = new Map(); // in-country cities: slug -> {slug, name, iata}
  const airports = new Set(); // in-country IATA codes
  const destBySlug = new Map(); // external destinations: key -> {slug, iata, country, name, m}
  const reachCountry = new Map(); // other country code -> connection count
  let domesticCount = 0;
  let internationalCount = 0;
  const distRoutes = []; // {label, km} for distance extremes

  for (const r of routes) {
    const oIn = r.origin_country === code;
    const dIn = r.destination_country === code;
    const m = meta[r.slug] || {};

    if (oIn) {
      airports.add(r.origin_iata);
      const s = slugForIata(r.origin_iata);
      if (s && !citiesBySlug.has(s)) citiesBySlug.set(s, { slug: s, iata: r.origin_iata, name: localizeCity(r.origin_city, r.origin_iata, lang) });
    }
    if (dIn) {
      airports.add(r.destination_iata);
      const s = slugForIata(r.destination_iata);
      if (s && !citiesBySlug.has(s)) citiesBySlug.set(s, { slug: s, iata: r.destination_iata, name: localizeCity(r.destination_city, r.destination_iata, lang) });
    }

    if (oIn && dIn) {
      domesticCount++;
    } else {
      internationalCount++;
      const extIsDest = oIn; // if origin is in-country, the external end is the destination
      const extName = extIsDest ? r.destination_city : r.origin_city;
      const extIata = extIsDest ? r.destination_iata : r.origin_iata;
      const extCountry = extIsDest ? r.destination_country : r.origin_country;
      if (extCountry) reachCountry.set(extCountry, (reachCountry.get(extCountry) || 0) + 1);
      const extSlug = slugForIata(extIata);
      const key = extSlug || extIata;
      if (key) {
        const prev = destBySlug.get(key);
        const info = (x) => (typeof x.route_score === 'number' ? 4 : 0) + (typeof x.airline_count === 'number' ? 2 : 0) + (typeof x.distance_km === 'number' ? 1 : 0);
        if (!prev || info(m) > info(prev.m)) {
          destBySlug.set(key, { slug: extSlug, iata: extIata, country: extCountry, name: localizeCity(extName, extIata, lang), m });
        }
      }
    }

    if (typeof m.distance_km === 'number' && m.distance_km > 0) {
      const oName = localizeCity(r.origin_city, r.origin_iata, lang);
      const dName = localizeCity(r.destination_city, r.destination_iata, lang);
      distRoutes.push({ label: `${oName} – ${dName}`, km: m.distance_km });
    }
  }

  const cities = [...citiesBySlug.values()].sort((a, b) => a.name.localeCompare(b.name));

  const reachCodes = [...reachCountry.keys()];
  const reachableCountries = reachCodes
    .map((c) => ({ code: c, name: localizeCountry(c, c, lang), count: reachCountry.get(c) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  let distances = null;
  if (distRoutes.length) {
    const sorted = [...distRoutes].sort((a, b) => a.km - b.km);
    distances = { shortest: sorted[0], longest: sorted[sorted.length - 1] };
  }

  const dests = [...destBySlug.values()];
  const hasPopularity = dests.some((d) => typeof d.m.route_score === 'number' || typeof d.m.airline_count === 'number');
  const ranked = [...dests].sort((a, b) => {
    const sa = typeof a.m.route_score === 'number' ? a.m.route_score : -1;
    const sb = typeof b.m.route_score === 'number' ? b.m.route_score : -1;
    if (sb !== sa) return sb - sa;
    const aa = typeof a.m.airline_count === 'number' ? a.m.airline_count : -1;
    const ab = typeof b.m.airline_count === 'number' ? b.m.airline_count : -1;
    if (ab !== aa) return ab - aa;
    return a.name.localeCompare(b.name);
  });

  return {
    cities,
    cityCount: cities.length,
    airportCount: airports.size,
    destinationCount: destBySlug.size,
    reachableCountries,
    reachableCountryCount: reachCodes.length,
    domesticCount,
    internationalCount,
    distances,
    hasPopularity,
    popularDestination: hasPopularity ? ranked[0] : null,
    topDestinations: hasPopularity ? ranked.slice(0, 8) : [],
  };
}

// [ANTI-BOILERPLATE] Per-country varied, data-driven intro (same approach as
// the city/airport intros): opening/closing picked by a stable hash of the
// country code, middle sentences woven from real numbers.
function buildCountryIntro(country, facts, countryName, lang) {
  const seed = country.code || countryName;
  const openKeys = ['countryIntroOpenA', 'countryIntroOpenB'];
  if (facts.cityCount > 0) openKeys.push('countryIntroOpenC');
  const openKey = openKeys[pickVariant(`${seed}:kintroOpen`, openKeys.length)];
  let s = format(translate(openKey, lang), { country: countryName, cityCount: nfmt(facts.cityCount, lang) });
  if (facts.cityCount > 0 && facts.airportCount > 0) {
    s += format(translate('countryIntroData', lang), {
      country: countryName,
      cityCount: nfmt(facts.cityCount, lang),
      airportCount: nfmt(facts.airportCount, lang),
    });
  }
  if (facts.reachableCountryCount > 0) {
    s += format(translate('countryIntroReach', lang), { country: countryName, countryCount: nfmt(facts.reachableCountryCount, lang) });
  }
  const closeKeys = ['countryIntroCloseA', 'countryIntroCloseB'];
  s += translate(closeKeys[pickVariant(`${seed}:kintroClose`, closeKeys.length)], lang);
  return s;
}

function buildCountryFaqItems(facts, countryName, lang) {
  const items = [];
  const sep = listSep(lang);
  const t = (key, vars) => format(translate(key, lang), Object.assign({ country: countryName }, vars));

  if (facts.airportCount > 0) {
    items.push({
      question: t('countryFaqAirportsQuestion'),
      answer: t('countryFaqAirportsAnswer', { count: nfmt(facts.airportCount, lang), cityCount: nfmt(facts.cityCount, lang) }),
    });
  }
  if (facts.cityCount > 0) {
    items.push({
      question: t('countryFaqCitiesQuestion'),
      answer: t('countryFaqCitiesAnswer', { count: nfmt(facts.cityCount, lang), cities: facts.cities.slice(0, 6).map((c) => c.name).join(sep) }),
    });
  }
  if (facts.destinationCount > 0) {
    items.push({
      question: t('countryFaqDestinationsQuestion'),
      answer: t('countryFaqDestinationsAnswer', { count: nfmt(facts.destinationCount, lang) }),
    });
  }
  if (facts.reachableCountryCount > 0) {
    items.push({
      question: t('countryFaqCountriesQuestion'),
      answer: t('countryFaqCountriesAnswer', { count: nfmt(facts.reachableCountryCount, lang), countries: facts.reachableCountries.slice(0, 10).map((c) => c.name).join(sep) }),
    });
  }
  if (facts.domesticCount > 0) {
    items.push({
      question: t('countryFaqDomesticQuestion'),
      answer: t('countryFaqDomesticAnswer', { count: nfmt(facts.domesticCount, lang) }),
    });
  }
  if (facts.popularDestination) {
    items.push({
      question: t('countryFaqPopularQuestion'),
      answer: t('countryFaqPopularAnswer', { destination: facts.popularDestination.name }),
    });
  }
  if (facts.distances) {
    items.push({
      question: t('countryFaqLongestQuestion'),
      answer: t('countryFaqLongestAnswer', { route: facts.distances.longest.label, distance: nfmt(facts.distances.longest.km, lang) }),
    });
  }
  return items;
}

module.exports = { computeCountryFacts, buildCountryIntro, buildCountryFaqItems };
