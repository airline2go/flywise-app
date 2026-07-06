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

const PROXY = process.env.API_BASE || 'https://api.airpiv.com';
const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(__dirname, '.snapshot');
const CONCURRENCY = 8;

const summary = {
  generated: { city: 0, country: 0, airport: 0, flights: 0, blog: 0 },
  skipped: [],
  urls: [],
};

function writePage(relPath, html) {
  const dir = path.join(ROOT, relPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
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

function writeIfValid(relPath, html, url, kind) {
  const { ok, problems } = validatePage(html);
  if (!ok) {
    console.warn(`[skip] ${relPath}: failed SEO validation (${problems.join('; ')})`);
    summary.skipped.push({ path: relPath, reason: `validation: ${problems.join('; ')}` });
    return false;
  }
  writePage(relPath, html);
  summary.generated[kind]++;
  summary.urls.push(url);
  return true;
}

async function generateCities(cityList) {
  await mapWithConcurrency(cityList, CONCURRENCY, async (c) => {
    const slug = c.city_slug;
    try {
      const detail = await fetchWithRetry(`${PROXY}/cities/${encodeURIComponent(slug)}`, { retries: 3, timeoutMs: 15000 });
      if (!detail.ok || !detail.city) throw new Error('unexpected response shape');
      const de = renderCityPage(detail.city, detail.routes || [], 'de');
      const en = renderCityPage(detail.city, detail.routes || [], 'en');
      writeIfValid(`city/${slug}`, de.html, de.seo.canonicalUrl, 'city');
      writeIfValid(`en/city/${slug}`, en.html, en.seo.canonicalUrl, 'city');
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
      const de = renderCountryPage(detail.country, detail.routes || [], 'de');
      const en = renderCountryPage(detail.country, detail.routes || [], 'en');
      writeIfValid(`country/${code}`, de.html, de.seo.canonicalUrl, 'country');
      writeIfValid(`en/country/${code}`, en.html, en.seo.canonicalUrl, 'country');
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
      const de = renderAirportPage(detail.airport, detail.routes || [], 'de');
      const en = renderAirportPage(detail.airport, detail.routes || [], 'en');
      writeIfValid(`airport/${code}`, de.html, de.seo.canonicalUrl, 'airport');
      writeIfValid(`en/airport/${code}`, en.html, en.seo.canonicalUrl, 'airport');
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
      const de = renderFlightRoutePage(detail.route, 'de');
      const en = renderFlightRoutePage(detail.route, 'en');
      writeIfValid(`flights/${slug}`, de.html, de.seo.canonicalUrl, 'flights');
      writeIfValid(`en/flights/${slug}`, en.html, en.seo.canonicalUrl, 'flights');
    } catch (e) {
      console.warn(`[skip] flights/${slug}: ${e.message}`);
      summary.skipped.push({ path: `flights/${slug}`, reason: e.message });
    }
  });
}

async function generateBlogPosts(postListDe, postListEn, allRoutes) {
  await mapWithConcurrency(postListDe, CONCURRENCY, async (p) => {
    const slug = p.slug;
    try {
      const detail = await fetchWithRetry(`${PROXY}/blog-posts/${encodeURIComponent(slug)}`, { retries: 3, timeoutMs: 15000 });
      if (!detail.ok || !detail.post) throw new Error('unexpected response shape');
      const de = renderBlogPostPage(detail.post, allRoutes, postListDe, 'de');
      writeIfValid(`blog/${slug}`, de.html, de.seo.canonicalUrl, 'blog');
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
      writeIfValid(`en/blog/${slug}`, en.html, en.seo.canonicalUrl, 'blog');
    } catch (e) {
      console.warn(`[skip] en/blog/${slug}: ${e.message}`);
      summary.skipped.push({ path: `en/blog/${slug}`, reason: e.message });
    }
  });
}

function writeSitemapEntities(urls) {
  const today = new Date().toISOString().slice(0, 10);
  const body = urls.map((u) => `  <url>\n    <loc>${u}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  fs.writeFileSync(path.join(ROOT, 'sitemap-entities.xml'), xml, 'utf8');

  // Add sitemap-entities.xml to the index alongside the existing entries —
  // sitemap-routes.xml is left in place for now (a subset of the new file;
  // removing it is a later cleanup once the new sitemap is confirmed
  // indexed correctly, same caution as the legacy-HTML migration).
  const indexPath = path.join(ROOT, 'sitemap.xml');
  let indexXml = fs.readFileSync(indexPath, 'utf8');
  if (!indexXml.includes('sitemap-entities.xml')) {
    indexXml = indexXml.replace(
      '</sitemapindex>',
      '<sitemap><loc>https://airpiv.com/sitemap-entities.xml</loc></sitemap>\n</sitemapindex>',
    );
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

  const airportCodes = Array.from(new Set(routes.flatMap((r) => [r.origin_iata, r.destination_iata]).filter(Boolean)));

  await generateCities(cities);
  await generateCountries(countries);
  await generateAirports(airportCodes);
  await generateFlightRoutes(routes);
  await generateBlogPosts(postsDe, postsEn, routes);

  writeSitemapEntities(summary.urls);

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
