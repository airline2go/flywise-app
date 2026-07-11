// Shared between app/(de)/layout.js (default language, unprefixed URLs)
// and app/[lang]/layout.js (the other 6 languages) — two independent
// Next.js root layouts (see route-groups.md's "multiple root layouts"
// pattern) that both need identical <html>/<body> structure, just with a
// different lang/direction. Kept as one component so the two thin
// layout.js files can't drift from each other.
//
// [HEAD-TAGS] Per Next.js's layout.md: "You should not manually add <head>
// tags such as <title> and <meta> to root layouts — use the Metadata API
// instead" (handled per-page via generateMetadata, see lib/metadata.js).
// What's rendered here are the non-metadata tags shell.js's original
// <head> also had — the GA/analytics scripts (via next/script, the
// documented way to load third-party scripts) and preconnect/stylesheet
// links (plain tags, not wrapped in a manual <head> element).
import Script from 'next/script';
import { getLanguage } from './languages';
import { SiteChrome, JsonLd, ORGANIZATION_SCHEMA } from './page-shell';
import { BookingProviders } from './booking/BookingProviders';
// [CSS-IMPORT] A bundled import, not a raw <link> tag pointing at
// public/ — guarantees correct <head> placement via Next's CSS pipeline
// rather than depending on React 19's separate (and here, empirically
// unreliable without a `precedence` prop) stylesheet-hoisting behavior.
// Same file, byte-for-byte, as the current static site's shared-layout.css.
import '../styles/shared-layout.css';

export default function RootLayoutChrome({ lang, children }) {
  const direction = getLanguage(lang).direction;
  return (
    <html lang={lang} dir={direction}>
      <body>
        <link rel="preconnect" href="https://api.airpiv.com" />
        <link rel="dns-prefetch" href="https://api.airpiv.com" />
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-2K257GSWEM" strategy="afterInteractive" />
        <Script src="/analytics.js" strategy="afterInteractive" />
        {/* [SHARED-ORGANIZATION-SCHEMA] shell.js injected this once into
            every page's <head> — position in the document doesn't affect
            how crawlers parse JSON-LD, only presence/content does. */}
        <JsonLd schema={ORGANIZATION_SCHEMA} />
        <BookingProviders>
          <SiteChrome lang={lang}>{children}</SiteChrome>
        </BookingProviders>
      </body>
    </html>
  );
}
