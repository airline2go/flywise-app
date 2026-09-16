import { getRoutePage } from '../content-api';
import { buildRouteSnapshot } from './route-snapshot';
import { getLanguage } from './languages';
import { translate, format } from './translate';

// [SSR-PRICE] Route pages must expose their persisted fare evidence in the
// initial HTML. The live client check remains an enhancement for real users,
// but crawlers and no-JS clients should never receive a "loading" placeholder.
// This helper intentionally uses the same canonical snapshot used by the
// renderer's title/meta/schema so the visible HTML cannot invent a second price.
function formatPrice(amount, currency, lang) {
  const locale = getLanguage(lang).locale;
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return null;
  const number = Math.round(value).toLocaleString(locale);
  if (currency === 'EUR') return `${number} €`;
  if (currency === 'USD') return `$${number}`;
  if (currency === 'GBP') return `£${number}`;
  return `${number} ${currency || 'EUR'}`;
}

export async function renderCanonicalRoutePriceHtml(html, slug, lang) {
  if (typeof html !== 'string' || !html) return html;
  const route = await getRoutePage(slug);
  if (!route) return html;

  const snapshot = buildRouteSnapshot(route);
  const price = snapshot && snapshot.price;
  const formatted = price ? formatPrice(price.amount, price.currency, lang) : null;
  if (!formatted) return html;

  const label = translate('priceLabel', lang);
  const checkedAt = price.checkedAt ? String(price.checkedAt).slice(0, 10) : null;
  const checkedText = checkedAt
    ? format(translate('priceLastCheckedTemplate', lang), { date: checkedAt })
    : '';

  // Replace only the initial placeholder inside the dedicated price box. If
  // the renderer changes its markup, fail closed and return the original HTML
  // rather than risking a malformed document.
  const pattern = /(<div class="route-price-box" id="route-price-box">)\s*<div style="color:rgba\(255,255,255,\.5\);font-size:13px">[\s\S]*?<\/div>\s*(<\/div>)/;
  if (!pattern.test(html)) return html;

  const content = `<div class="route-price-val">${formatted}</div><div class="route-price-lbl">${label}</div>`;
  const trust = checkedText
    ? `<div class="route-trust-signal" id="route-trust-signal">${checkedText}</div>`
    : '';

  return html.replace(pattern, `$1${content}$2`).replace(
    /(<div class="route-price-box" id="route-price-box">[\s\S]*?<\/div>)\s*<div class="route-trust-signal" id="route-trust-signal" style="display:none"><\/div>/,
    `$1${trust}`,
  );
}

export default { renderCanonicalRoutePriceHtml };
