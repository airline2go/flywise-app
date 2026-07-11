import { notFound } from 'next/navigation';
import { LANGUAGE_CODES, DEFAULT_LANGUAGE } from '../../lib/languages';
import RootLayoutChrome from '../../lib/RootLayoutChrome';
import { SITE_ICONS } from '../../lib/site-metadata';

export const metadata = { icons: SITE_ICONS };

// The six non-default languages live under /xx/ — German is intentionally
// excluded here (it lives at the unprefixed root via app/(de)/) so
// /de/city/munich 404s instead of existing as a duplicate URL for
// already-indexed content.
const PREFIXED_LANGUAGE_CODES = LANGUAGE_CODES.filter((c) => c !== DEFAULT_LANGUAGE);

export function generateStaticParams() {
  return PREFIXED_LANGUAGE_CODES.map((lang) => ({ lang }));
}

export default async function PrefixedLangRootLayout({ children, params }) {
  const { lang } = await params;
  if (!PREFIXED_LANGUAGE_CODES.includes(lang)) notFound();
  return <RootLayoutChrome lang={lang}>{children}</RootLayoutChrome>;
}
