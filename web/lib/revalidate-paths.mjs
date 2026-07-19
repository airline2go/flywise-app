// [ON-DEMAND-REVALIDATE] Pure, dependency-injected helpers behind the
// /api/revalidate route handler. Kept free of any `next/*` import (and of a
// hard import of ./languages.js, whose ESM-via-Next form plain Node can't load)
// so this logic — which entity types map to which URLs, and how the IndexNow
// payload is shaped — is unit-testable with `node --test`. The route handler
// passes the real LANGUAGES / pathFor from ./languages.js.

// Maps an entity `type` (as sent by flywise-server's admin routes) to the URL
// segment its pages live under — matches the folder names under app/(de)/ and
// app/[lang]/. An unknown type is ignored.
const BASE_PATH = {
  city: 'city',
  country: 'country',
  airport: 'airport',
  airline: 'airline',
  route: 'flights',
  blog: 'blog',
};

// Turn the admin's `entities` payload into the de-duplicated list of app paths
// to revalidate. City/country/airport/airline/route pages share one slug across
// all languages (only the URL prefix differs) → revalidate every language
// variant. Blog posts carry an independent slug per language (slug/slug_en), so
// only the language the caller named is revalidated. Invalid/unknown entries
// are skipped, never throwing.
function computeRevalidatePaths(entities, languages, pathFor) {
  const paths = [];
  for (const entity of Array.isArray(entities) ? entities : []) {
    if (!entity || typeof entity.slug !== 'string' || !entity.slug) continue;
    const base = BASE_PATH[entity.type];
    if (!base) continue;
    if (entity.type === 'blog') {
      const lang = entity.lang === 'en' ? 'en' : 'de';
      paths.push(pathFor(lang, `${base}/${entity.slug}`));
    } else {
      for (const l of languages) paths.push(pathFor(l.code, `${base}/${entity.slug}`));
    }
  }
  return [...new Set(paths)];
}

// Build the IndexNow submission body for a set of already-computed app paths.
// Pure — the route handler owns the actual network call.
function buildIndexNowPayload(paths, { origin, key }) {
  return {
    host: origin.replace(/^https?:\/\//, ''),
    key,
    keyLocation: `${origin}/${key}.txt`,
    urlList: paths.map((p) => `${origin}${p}`),
  };
}

export { BASE_PATH, computeRevalidatePaths, buildIndexNowPayload };
