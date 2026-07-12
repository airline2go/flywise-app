// [PATHS] Build the concrete URL for a page on a given target + language.
//
// Legacy and candidate address the same logical page differently:
//   - candidate (Next.js): German at the unprefixed root, others under /xx/.
//     e.g. home → '/' (de) or '/en' (en); '/about' (de) or '/en/about' (en).
//   - legacy (static files): the default language is the plain file; a
//     localized variant is a *separate file* the page must declare via
//     `legacyByLang` (e.g. { en: '/about-en.html' }). Pages that only list
//     `langs: ['de']` never need it.

import { DEFAULT_LANGUAGE } from '../config.mjs';

export function legacyUrlFor(base, page, lang) {
  if (lang === DEFAULT_LANGUAGE) return base + page.legacy;
  const override = page.legacyByLang && page.legacyByLang[lang];
  if (override) return base + override;
  throw new Error(
    `Page "${page.id}" lists language "${lang}" but has no legacyByLang["${lang}"] mapping`,
  );
}

export function candidateUrlFor(base, page, lang) {
  const clean = base.replace(/\/$/, '');
  if (lang === DEFAULT_LANGUAGE) return clean + page.candidate;
  // Home is the one page whose candidate path is '/', which must not become
  // '/en/' — the localized home is just '/en'.
  if (page.candidate === '/') return `${clean}/${lang}`;
  return `${clean}/${lang}${page.candidate}`;
}

// A stable, filesystem-safe key for one screenshot: page__lang__viewport.
export function shotKey(page, lang, viewportId) {
  return `${page.id}__${lang}__${viewportId}`;
}
