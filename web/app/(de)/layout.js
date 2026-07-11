import RootLayoutChrome from '../../lib/RootLayoutChrome';
import { SITE_ICONS } from '../../lib/site-metadata';

// Identical across every page (not per-entity), so it lives on the root
// layout — child pages' generateMetadata() only needs to set per-page
// fields, everything here is inherited automatically.
export const metadata = { icons: SITE_ICONS };

// [DEFAULT-LANGUAGE] German is the platform's original/default language
// and keeps its existing unprefixed root path (/city/munich) — this
// route group adds no URL segment, matching languages.js's pathPrefix('de') === ''.
export default function GermanRootLayout({ children }) {
  return <RootLayoutChrome lang="de">{children}</RootLayoutChrome>;
}
