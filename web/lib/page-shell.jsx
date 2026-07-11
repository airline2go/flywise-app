// Adapted from flywise-app/build/shell.js. The head-tag construction
// (title/description/canonical/hreflang/OG/robots) moved to Next.js's
// native Metadata API (see lib/metadata.js) — that's the idiomatic
// Next.js mechanism and Next.js itself decides how those tags are
// emitted. What's left here is the actual page chrome (nav/footer JSX,
// unchanged markup/classes so shared-layout.css applies identically) and
// the JSON-LD safety helper, which still needs the exact same escaping
// the original did.
import { DEFAULT_LANGUAGE, pathPrefix } from './languages';
import { translate } from './translate';

// Fixed, identical-across-every-language site paths — ported verbatim.
const ABOUT_HREF = '/about.html';
const BLOG_HREF = '/blog.html';
const CONTACT_HREF = '/contact.html';
const PRIVACY_HREF = '/privacy.html';
const TERMS_HREF = '/terms.html';

// [SHARED-ORGANIZATION-SCHEMA] ported verbatim.
const ORGANIZATION_SCHEMA = { '@context': 'https://schema.org', '@type': 'Organization', name: 'Airpiv', url: 'https://airpiv.com', logo: 'https://airpiv.com/apple-touch-icon.png' };

// [OG-LOCALE] ported verbatim.
const OG_LOCALE = { de: 'de_DE', en: 'en_GB', ar: 'ar_AR', es: 'es_ES', fr: 'fr_FR', it: 'it_IT', nl: 'nl_NL' };

function homeHref(lang) {
  const prefix = pathPrefix(lang);
  return prefix ? `/${prefix}/` : '/';
}

// [JSONLD-XSS-FIX] Same escaping as the original jsonLdScript() — React's
// dangerouslySetInnerHTML does NOT auto-escape, so this protection has to
// be applied explicitly here, not assumed to come for free from JSX.
function jsonLdSafeString(schema) {
  return JSON.stringify(schema).replace(/</g, '\\u003c');
}

// A single JSON-LD <script> tag, safe to render as many times as needed
// per page (breadcrumb, WebPage, Organization, etc. are each their own
// standalone block, matching the original's multiple-script-tags pattern).
function JsonLd({ schema }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdSafeString(schema) }}
    />
  );
}

// The nav/footer chrome shared by every entity page — same markup/classes
// as shell.js's renderShell() so shared-layout.css applies identically
// (no visual change, only the templating mechanism changed).
//
// [PLAIN-ANCHORS-INTENTIONAL] These deliberately stay <a> tags, not
// next/link's <Link> — "/" is NOT part of this Next.js app (see the
// migration plan's routing section: the home/search page stays on the
// current static site, reached only via a Vercel rewrite once this app
// becomes the front door). <Link> would try to client-side-navigate
// within this app's own router and could bypass that rewrite; a plain
// <a> guarantees a real full-page request that the rewrite layer sees.
function SiteChrome({ lang, children }) {
  const searchLabel = translate('searchLabel', lang);
  const footerTagline = translate('footerTagline', lang);
  const companyLabel = translate('companyLabel', lang);
  const aboutLabel = translate('aboutLabel', lang);
  const blogLabel = translate('blogLabel', lang);
  const supportLabel = translate('supportLabel', lang);
  const contactLabel = translate('contactLabel', lang);
  const privacyLabel = translate('privacyLabel', lang);
  const termsLabel = translate('termsLabel', lang);
  const copyright = translate('copyright', lang);

  return (
    <>
      <nav className="topnav">
        <div className="navi">
          <a href={homeHref(lang)} className="logo">
            <picture>
              <source srcSet="/airpiv-logo.webp" type="image/webp" />
              <img src="/airpiv-logo.png" alt="Airpiv" width="118" height="38" />
            </picture>
          </a>
          <div className="navr">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- see PLAIN-ANCHORS-INTENTIONAL above */}
            <a href="/" className="btn-t">{searchLabel}</a>
          </div>
        </div>
      </nav>

      {children}

      <footer>
        <div className="fi2">
          <div className="fgr">
            <div>
              <div className="flo">
                <span style={{ display: 'inline-flex', width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg,#12C7B0,#0A9384)', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="17" height="17" viewBox="0 0 64 64" fill="none"><path d="M32 14 L46 46 L32 38 L18 46 Z" fill="#0A1822" /></svg>
                </span>
                Air<span style={{ color: 'var(--teal)' }}>piv</span>
              </div>
              <p className="fdes">{footerTagline}</p>
            </div>
            <div className="fcol">
              <h4>{companyLabel}</h4>
              <ul>
                <li><a href={ABOUT_HREF}>{aboutLabel}</a></li>
                <li><a href={BLOG_HREF}>{blogLabel}</a></li>
              </ul>
            </div>
            <div className="fcol">
              <h4>{supportLabel}</h4>
              <ul>
                <li><a href={CONTACT_HREF}>{contactLabel}</a></li>
                <li><a href={PRIVACY_HREF}>{privacyLabel}</a></li>
                <li><a href={TERMS_HREF}>{termsLabel}</a></li>
              </ul>
            </div>
          </div>
          <div className="fbot"><p>{copyright}</p></div>
        </div>
      </footer>
    </>
  );
}

export { ORGANIZATION_SCHEMA, OG_LOCALE, DEFAULT_LANGUAGE, homeHref, jsonLdSafeString, JsonLd, SiteChrome };
