#!/usr/bin/env node
// [SSG-BUILD] Generates fully-rendered, SEO-complete HTML for every
// city/country/airport/flight-route/blog-post page at deploy time — see
// README.md and the project plan for why (client-side-injected SEO content
// is invisible to non-JS crawlers/link previews). Run via `npm run build`.

const fs = require('fs');
const path = require('path');

const { fetchWithRetry, mapWithConcurrency } = require('./fetch-utils');
const { validatePage } = require('./validate-page');
const { renderCityPage } = require('./render-city');
const { renderCountryPage } = require('./render-country');
const { renderAirportPage } = require('./render-airport');
const { renderFlightRoutePage } = require('./render-flight-route');
const { renderBlogPostPage } = require('./render-blog-post');
const { setGeoData } = require('./data');
const { LANGUAGES, pathPrefix } = require('./languages');

const PROXY = process.env.API_BASE || 'https://api.airpiv.com';
const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(__dirname, '.snapshot');
const CONCURRENCY = 8;

const summary = {
  generated: { city: 0, country: 0, airport: 0, flights: 0, blog: 0 },
  skipped: [],
  urls: [],
  // [MULTI-LANG-SITEMAP] URLs grouped by language, for the 7 per-language
  // sitemap-{lang}.xml files — separate from the flat `urls` list above
  // (kept for the summary.urls.length total-pages count).
  urlsByLang: Object.fromEntries(LANGUAGES.map((l) => [l.code, []])),
};

function writePage(relPath, html) {
  const filePath = path.join(ROOT, `${relPath}.html`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, html, 'utf8');
}

function saveSnapshot(name, data) {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  fs.writeFileSync(path.join(SNAPSHOT_DIR, `${name}.json`), JSON.stringify(data, null, 2), 'utf8');
}

// [FAIL-FAST] A list endpoint failing after retries aborts the whole build —
// there's nothing safe to generate without knowing what exists. Render
// keeps the last successful deploy live when a build fails, which is the
// correct behavior here (never publish a partial site).
async function fetchListOrDie(name, url, extractKey) {
  try {
    const json = await fetchWithRetry(url, { retries: 3, timeoutMs: 15000 });
    const list = json[extractKey] || [];
    saveSnapshot(name, list);
    console.log(`[list] ${name}: ${list.length} items`);
    return list;
  } catch (e) {
    console.error(`[FATAL] Could not fetch required list "${name}" from ${url}: ${e.message}`);
    console.error('Aborting build — no pages will be published this run.');
    process.exit(1);
  }
}

function writeIfValid(relPath, html, url, kind, langCode) {
  const { ok, problems } = validatePage(html);
  if (!ok) {
    console.warn(`[skip] ${relPath}: failed SEO validation (${problems.join('; ')})`);
    summary.skipped.push({ path: relPath, reason: `validation: ${problems.join('; ')}` });
    return false;
  }
  writePage(relPath, html);
  summary.generated[kind]++;
  summary.urls.push(url);
  if (langCode) summary.urlsByLang[langCode].push(url);
  return true;
}

// [N-LANGUAGE-SSG] Every entity type (city/country/airport/route) writes
// one page per language in LANGUAGES — German unprefixed at root
// (preserving already-indexed URLs), the other 6 under /xx/ — replacing
// the old fixed 2-call (de + en) dual-write.
async function generateCities(cityList) {
  await mapWithConcurrency(cityList, CONCURRENCY, async (c) => {
    const slug = c.city_slug;
    try {
      const detail = await fetchWithRetry(`${PROXY}/cities/${encodeURIComponent(slug)}`, { retries: 3, timeoutMs: 15000 });
      if (!detail.ok || !detail.city) throw new Error('unexpected response shape');
      LANGUAGES.forEach((l) => {
        const { html, seo } = renderCityPage(detail.city, detail.routes || [], l.code);
        const prefix = pathPrefix(l.code);
        writeIfValid(`${prefix ? prefix + '/' : ''}city/${slug}`, html, seo.canonicalUrl, 'city', l.code);
      });
    } catch (e) {
      console.warn(`[skip] city/${slug}: ${e.message}`);
      summary.skipped.push({ path: `city/${slug}`, reason: e.message });
    }
  });
}

async function generateCountries(countryList) {
  await mapWithConcurrency(countryList, CONCURRENCY, async (c) => {
    const code = c.code;
    try {
      const detail = await fetchWithRetry(`${PROXY}/countries/${encodeURIComponent(code)}`, { retries: 3, timeoutMs: 15000 });
      if (!detail.ok || !detail.country) throw new Error('unexpected response shape');
      LANGUAGES.forEach((l) => {
        const { html, seo } = renderCountryPage(detail.country, detail.routes || [], l.code);
        const prefix = pathPrefix(l.code);
        writeIfValid(`${prefix ? prefix + '/' : ''}country/${code}`, html, seo.canonicalUrl, 'country', l.code);
      });
    } catch (e) {
      console.warn(`[skip] country/${code}: ${e.message}`);
      summary.skipped.push({ path: `country/${code}`, reason: e.message });
    }
  });
}

// Airports have no dedicated list endpoint (see content.routes.js comment —
// every route_pages row already carries both airports' IATA codes) — derive
// the distinct set of airport codes from the route-pages list already
// fetched for the flight-route pages.
async function generateAirports(airportCodes) {
  await mapWithConcurrency(airportCodes, CONCURRENCY, async (code) => {
    try {
      const detail = await fetchWithRetry(`${PROXY}/airports/${encodeURIComponent(code)}`, { retries: 3, timeoutMs: 15000 });
      if (!detail.ok || !detail.airport) throw new Error('unexpected response shape');
      LANGUAGES.forEach((l) => {
        const { html, seo } = renderAirportPage(detail.airport, detail.routes || [], l.code);
        const prefix = pathPrefix(l.code);
        writeIfValid(`${prefix ? prefix + '/' : ''}airport/${code}`, html, seo.canonicalUrl, 'airport', l.code);
      });
    } catch (e) {
      console.warn(`[skip] airport/${code}: ${e.message}`);
      summary.skipped.push({ path: `airport/${code}`, reason: e.message });
    }
  });
}

async function generateFlightRoutes(routeList) {
  await mapWithConcurrency(routeList, CONCURRENCY, async (r) => {
    const slug = r.slug;
    try {
      const detail = await fetchWithRetry(`${PROXY}/route-pages/${encodeURIComponent(slug)}`, { retries: 3, timeoutMs: 15000 });
      if (!detail.ok || !detail.route) throw new Error('unexpected response shape');
      LANGUAGES.forEach((l) => {
        const { html, seo } = renderFlightRoutePage(detail.route, l.code);
        const prefix = pathPrefix(l.code);
        writeIfValid(`${prefix ? prefix + '/' : ''}flights/${slug}`, html, seo.canonicalUrl, 'flights', l.code);
      });
    } catch (e) {
      console.warn(`[skip] flights/${slug}: ${e.message}`);
      summary.skipped.push({ path: `flights/${slug}`, reason: e.message });
    }
  });
}

// [BLOG-STAYS-DE-EN] Blog posts are independently-authored content per
// language via separate backend endpoints (/blog-posts, /blog-posts-en) —
// not "translate one entity N ways" like every other page type above, so
// this intentionally stays out of the N-language loop. A genuinely new
// language's blog would need its own authored posts and its own endpoint,
// not a code change here.
async function generateBlogPosts(postListDe, postListEn, allRoutes) {
  await mapWithConcurrency(postListDe, CONCURRENCY, async (p) => {
    const slug = p.slug;
    try {
      const detail = await fetchWithRetry(`${PROXY}/blog-posts/${encodeURIComponent(slug)}`, { retries: 3, timeoutMs: 15000 });
      if (!detail.ok || !detail.post) throw new Error('unexpected response shape');
      const de = renderBlogPostPage(detail.post, allRoutes, postListDe, 'de');
      writeIfValid(`blog/${slug}`, de.html, de.seo.canonicalUrl, 'blog', 'de');
    } catch (e) {
      console.warn(`[skip] blog/${slug}: ${e.message}`);
      summary.skipped.push({ path: `blog/${slug}`, reason: e.message });
    }
  });
  await mapWithConcurrency(postListEn, CONCURRENCY, async (p) => {
    const slug = p.slug;
    try {
      const detail = await fetchWithRetry(`${PROXY}/blog-posts-en/${encodeURIComponent(slug)}`, { retries: 3, timeoutMs: 15000 });
      if (!detail.ok || !detail.post) throw new Error('unexpected response shape');
      const en = renderBlogPostPage(detail.post, allRoutes, postListEn, 'en');
      writeIfValid(`en/blog/${slug}`, en.html, en.seo.canonicalUrl, 'blog', 'en');
    } catch (e) {
      console.warn(`[skip] en/blog/${slug}: ${e.message}`);
      summary.skipped.push({ path: `en/blog/${slug}`, reason: e.message });
    }
  });
}

function urlsetXml(urls) {
  const today = new Date().toISOString().slice(0, 10);
  const body = urls.map((u) => `  <url>\n    <loc>${u}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

// [MULTI-LANG-SITEMAP] One sitemap-{lang}.xml per language, each holding
// only that language's URLs, plus sitemap.xml extended to list all 7 —
// replacing the old flat sitemap-entities.xml (one file mixing every
// language's URLs together, which doesn't let Search Console track
// per-language indexing separately).
function writeLanguageSitemaps(urlsByLang) {
  const sitemapEntries = [];
  LANGUAGES.forEach((l) => {
    const urls = urlsByLang[l.code] || [];
    const filename = `sitemap-${l.code}.xml`;
    fs.writeFileSync(path.join(ROOT, filename), urlsetXml(urls), 'utf8');
    sitemapEntries.push(`<sitemap><loc>https://airpiv.com/${filename}</loc></sitemap>`);
    console.log(`[sitemap] ${filename}: ${urls.length} URLs`);
  });

  // Idempotent index patch, same string-replace pattern the old
  // writeSitemapEntities() used — safe to re-run the build any number of
  // times without duplicating entries.
  const indexPath = path.join(ROOT, 'sitemap.xml');
  let indexXml = fs.readFileSync(indexPath, 'utf8');
  const missingEntries = sitemapEntries.filter((entry) => !indexXml.includes(entry));
  if (missingEntries.length) {
    indexXml = indexXml.replace('</sitemapindex>', `${missingEntries.join('\n')}\n</sitemapindex>`);
    fs.writeFileSync(indexPath, indexXml, 'utf8');
  }
}

async function main() {
  console.log(`[generate-pages] API_BASE=${PROXY}`);

  const cities = await fetchListOrDie('cities', `${PROXY}/cities`, 'cities');
  const countries = await fetchListOrDie('countries', `${PROXY}/countries`, 'countries');
  const routes = await fetchListOrDie('route-pages', `${PROXY}/route-pages`, 'routes');
  const postsDe = await fetchListOrDie('blog-posts-de', `${PROXY}/blog-posts`, 'posts');
  const postsEn = await fetchListOrDie('blog-posts-en', `${PROXY}/blog-posts-en`, 'posts');

  // [GEO-CMS] Populate the shared city/country translation lookup once,
  // before any page renders — every render-*.js file's localizeCity()/
  // localizeCountry() call reads from this for the rest of the build.
  setGeoData(cities, countries);

  const airportCodes = Array.from(new Set(routes.flatMap((r) => [r.origin_iata, r.destination_iata]).filter(Boolean)));

  await generateCities(cities);
  await generateCountries(countries);
  await generateAirports(airportCodes);
  await generateFlightRoutes(routes);
  await generateBlogPosts(postsDe, postsEn, routes);

  writeLanguageSitemaps(summary.urlsByLang);

  console.log('\n=== Build summary ===');
  console.log(`Cities:   ${summary.generated.city}`);
  console.log(`Countries:${summary.generated.country}`);
  console.log(`Airports: ${summary.generated.airport}`);
  console.log(`Flights:  ${summary.generated.flights}`);
  console.log(`Blog:     ${summary.generated.blog}`);
  console.log(`Total pages written: ${summary.urls.length}`);
  if (summary.skipped.length) {
    console.log(`\nSkipped (${summary.skipped.length}):`);
    summary.skipped.forEach((s) => console.log(`  - ${s.path}: ${s.reason}`));
  } else {
    console.log('No pages skipped.');
  }
}

main().catch((e) => {
  console.error('[FATAL] Unexpected build error:', e);
  process.exit(1);
});
