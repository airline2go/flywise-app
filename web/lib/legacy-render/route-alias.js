import { listRoutePages } from '../content-api';

// Route aliases are intentionally conservative. We only redirect when the
// destination is an existing published route and the mapping is unambiguous.
// This protects SEO from fuzzy guesses, redirect chains, and 301 -> 404.
function normalizeToken(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeRouteSlug(slug) {
  return String(slug || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\/+$/g, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-');
}

function pairKey(origin, destination) {
  const a = normalizeToken(origin);
  const b = normalizeToken(destination);
  return a && b ? `${a}-${b}` : null;
}

function airportPairKey(origin, destination) {
  const a = String(origin || '').trim().toLowerCase();
  const b = String(destination || '').trim().toLowerCase();
  return /^[a-z0-9]{3}$/.test(a) && /^[a-z0-9]{3}$/.test(b) ? `${a}-${b}` : null;
}

/**
 * Resolve only safe, already-existing aliases:
 * 1. exact published slug (no redirect);
 * 2. case/Unicode/punctuation-normalized form, if it exists;
 * 3. legacy city-pair slug, only when exactly one published route matches;
 * 4. otherwise null, leaving the normal renderer to return a real 404.
 *
 * We deliberately do NOT use fuzzy edit-distance or arbitrary airport guesses.
 * A typo must never silently redirect to a different route and dilute signals.
 */
export async function resolveRouteSlugAlias(slug) {
  const requested = String(slug || '').trim();
  if (!requested) return null;

  const routes = await listRoutePages();
  const published = routes.filter((route) => route && route.slug);
  const byExact = new Map(published.map((route) => [String(route.slug), route]));

  if (byExact.has(requested)) return null;

  const normalized = normalizeRouteSlug(requested);
  if (normalized && normalized !== requested && byExact.has(normalized)) {
    return normalized;
  }

  // Explicit airport-pair normalization handles legacy uppercase IATA paths
  // without accepting fuzzy airport-code corrections.
  const airportKey = normalized || requested.toLowerCase();
  const airportMatches = published.filter((route) =>
    airportPairKey(route.origin_iata, route.destination_iata) === airportKey
  );
  if (airportMatches.length === 1 && airportMatches[0].slug !== requested) {
    return airportMatches[0].slug;
  }

  // Old city-pair URLs are safe only when the city pair maps to one published
  // route. If multiple airports serve either city, we refuse to guess.
  const requestedCityPair = normalizeToken(requested);
  if (!requestedCityPair) return null;

  const cityMatches = published.filter((route) =>
    pairKey(route.origin_city, route.destination_city) === requestedCityPair
  );
  if (cityMatches.length === 1 && cityMatches[0].slug !== requested) {
    return cityMatches[0].slug;
  }

  return null;
}
