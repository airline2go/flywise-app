const { escHtml, renderShell, jsonLdScript, homeHref } = require('./shell');
const { localizeCity } = require('./data');
const { translate } = require('./translate');
const { getLanguage, pathFor, urlFor, urlsFor } = require('./languages');

const ROUTES_PER_PAGE = 50;

function renderRouteSitemapPage({ routes, lang, page, totalPages }) {
  const locale = getLanguage(lang).locale;
  const title = lang === 'en' ? `Flight routes sitemap ${page} | Airpiv` : `Flugrouten-Sitemap ${page} | Airpiv`;
  const description = lang === 'en'
    ? `Browse ${routes.length} verified Airpiv flight routes. Page ${page} of ${totalPages}.`
    : `${routes.length} verifizierte Airpiv-Flugrouten durchsuchen. Seite ${page} von ${totalPages}.`;
  const urls = urlsFor(`sitemap/routes/${page}`);
  const url = urls[lang];

  const routeItems = routes.map((r) => {
    const origin = localizeCity(r.origin_city, r.origin_iata, lang);
    const destination = localizeCity(r.destination_city, r.destination_iata, lang);
    return `<li><a href="${pathFor(lang, `flights/${encodeURIComponent(r.slug)}`)}">${escHtml(origin)} → ${escHtml(destination)}</a></li>`;
  }).join('');

  const pagination = [];
  if (page > 1) pagination.push(`<a rel="prev" href="${pathFor(lang, `sitemap/routes/${page - 1}`)}">‹ Previous</a>`);
  if (page < totalPages) pagination.push(`<a rel="next" href="${pathFor(lang, `sitemap/routes/${page + 1}`)}">Next ›</a>`);
  const paginationHtml = pagination.length
    ? `<nav aria-label="Route sitemap pagination" style="display:flex;gap:16px;margin-top:24px">${pagination.join('')}</nav>`
    : '';

  const breadcrumbHtml = `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="${homeHref(lang)}">${translate('homeLabel', lang)}</a><span>›</span><a href="${pathFor(lang, 'sitemap')}">${translate('sitemapLabel', lang)}</a><span>›</span><span>Flight routes ${page}</span></nav>`;
  const mainContent = `<main id="route-sitemap-main"><div id="route-sitemap-content">${breadcrumbHtml}<h1>${escHtml(title)}</h1><p>${escHtml(description)}</p><ul class="sitemap-links sitemap-routes">${routeItems}</ul>${paginationHtml}</div></main>`;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url,
    inLanguage: locale,
    numberOfItems: routes.length,
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: translate('homeLabel', lang), item: urlFor(lang, '') },
      { '@type': 'ListItem', position: 2, name: translate('sitemapLabel', lang), item: urlFor(lang, 'sitemap') },
      { '@type': 'ListItem', position: 3, name: `Flight routes ${page}`, item: url },
    ],
  };
  const headExtra = `${jsonLdScript(schema)}\n${jsonLdScript(breadcrumbSchema)}<style>.breadcrumb{display:flex;gap:6px;align-items:center;font-size:12.5px;color:var(--tx3);margin-bottom:14px;flex-wrap:wrap}.breadcrumb a{color:var(--teal);text-decoration:none}.sitemap-links{list-style:none;margin:0;padding:0;column-width:220px;column-gap:28px}.sitemap-links li{break-inside:avoid;margin:0 0 8px;font-size:13.5px;line-height:1.4}.sitemap-links a{color:var(--tx);text-decoration:none}.sitemap-links a:hover{color:var(--teal)}@media(max-width:480px){.sitemap-links{column-width:155px;column-gap:16px}}</style>`;
  const html = renderShell({
    lang,
    title,
    description,
    canonicalUrl: url,
    urls,
    robotsContent: 'index, follow',
    headExtra,
    mainContent,
  });
  return { html, seo: { title, description, canonicalUrl: url, schema } };
}

module.exports = { renderRouteSitemapPage, ROUTES_PER_PAGE };
