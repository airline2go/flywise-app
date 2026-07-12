'use client';

// The homepage's OWN chrome — top nav, 4-column footer, mobile bottom nav
// and cookie banner — ported verbatim from index.html. The old SSG entity
// pages use a simpler nav/footer (build/shell.js), which the shared
// SiteChrome (lib/page-shell.jsx) already matches; the homepage in the
// original has this richer chrome instead. So on "/" (and "/xx/") we render
// this chrome and hide the shared SiteChrome nav/footer via direct-child
// selectors (body > nav.topnav / body > footer) that only match the shared
// ones — the homepage's own nav/footer live inside .fw-home-root, and entity
// pages are untouched. (A cleaner long-term fix is a layout split; tracked as
// tech debt.)
//
// Interactive bits ported: language switcher (navigates to the same page in
// the chosen language), dark-mode toggle (data-theme + localStorage 'dm',
// same as initDarkMode/toggleDark), and cookie-consent dismissal. The
// register button + user menu are rendered pixel-identically; the auth modal
// itself is milestone B6 (Supabase) — the button is visual for now.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LANGUAGES, DEFAULT_LANGUAGE, pathPrefix } from '../languages';
import { CHROME_STRINGS } from './chromeStrings';

function homeHref(lang) {
  const p = pathPrefix(lang);
  return p ? `/${p}/` : '/';
}

const LANG_LABELS = { de: 'DE', en: 'EN', ar: 'AR', es: 'ES', fr: 'FR', it: 'IT', nl: 'NL' };
// Order matches index.html's switcher (DE first, then EN AR ES FR IT NL).
const SWITCHER_ORDER = ['de', 'en', 'ar', 'es', 'fr', 'it', 'nl'];

export default function HomeChrome({ lang, children }) {
  const c = CHROME_STRINGS[lang] || CHROME_STRINGS.de;
  const [dark, setDark] = useState(false);
  const [cookieHidden, setCookieHidden] = useState(true); // hidden until we know (avoids flash on accepted)

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (localStorage.getItem('dm') === '1') {
          document.documentElement.setAttribute('data-theme', 'dark');
          setDark(true);
        }
        setCookieHidden(localStorage.getItem('ck') === '1');
      } catch { /* ignore */ }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  function toggleDark() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    try { localStorage.setItem('dm', isDark ? '0' : '1'); } catch { /* ignore */ }
    setDark(!isDark);
  }

  function acceptCookies() {
    try { localStorage.setItem('ck', '1'); } catch { /* ignore */ }
    setCookieHidden(true);
  }

  return (
    <div className="fw-home-root">
      {/* Hide the shared entity-page chrome on the homepage only (see header). */}
      <style>{'body > nav.topnav, body > footer { display: none !important; }'}</style>

      <nav className="topnav">
        <div className="navi">
          <Link href={homeHref(lang)} className="logo">
            <picture>
              <source srcSet="/airpiv-logo.webp" type="image/webp" />
              <img src="/airpiv-logo.png" alt="Airpiv" width="118" height="38" style={{ height: 38, width: 'auto', display: 'block' }} />
            </picture>
          </Link>
          <ul className="navls">
            <li><a className="act">{c.nav_flights}</a></li>
            <li><a>{c.nav_hotels}</a></li>
            <li><a>{c.nav_cars}</a></li>
            <li><a>{c.nav_deals}</a></li>
            <li><a>{c.nav_help}</a></li>
          </ul>
          <div className="navr">
            <div className="lang-sw" style={{ display: 'flex', gap: 0 }}>
              {SWITCHER_ORDER.map((code) => (
                <Link
                  key={code}
                  href={homeHref(code)}
                  className={`lang-btn${code === lang ? ' active' : ''}`}
                  id={`lang-${code}`}
                >{LANG_LABELS[code]}</Link>
              ))}
            </div>
            <button type="button" className="dm-btn" title="Dark Mode" aria-label="Dunkelmodus umschalten" style={{ margin: 0 }} onClick={toggleDark}>
              <span id="dm-ico">{dark ? '☀️' : '🌙'}</span>
            </button>
            <button type="button" className="btn-t" id="nav-auth-btn" style={{ margin: '0 0 0 6px' }}>{c.nav_register}</button>
          </div>
        </div>
      </nav>

      {children}

      <footer>
        <div className="fi2">
          <div className="fgr">
            <div>
              <div className="flo">
                <span className="logo-i" style={{ width: 26, height: 26 }}>
                  <svg width="17" height="17" viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M32 14 L46 46 L32 38 L18 46 Z" fill="currentColor" /></svg>
                </span>
                Air<span style={{ color: 'var(--teal)' }}>piv</span>
              </div>
              <p className="fdes">Finde Flüge, die sonst niemand findet. 600+ Airlines, beste Preise, volle Garantie.</p>
            </div>
            <div className="fcol">
              <h4>Entdecken</h4>
              <ul>
                <li><a href="/cheap-flights.html">Günstige Flüge</a></li>
                <li><a href="/last-minute-flights.html">Last Minute Flüge</a></li>
                <li><a href="#">Hotels</a></li>
                <li><a href="#">Mietwagen</a></li>
              </ul>
            </div>
            <div className="fcol">
              <h4>Unternehmen</h4>
              <ul>
                <li><a href="/about.html">Über uns</a></li>
                <li><a href="#">Karriere</a></li>
                <li><a href="#">Presse</a></li>
                <li><a href="/blog.html">Blog</a></li>
              </ul>
            </div>
            <div className="fcol">
              <h4>Support</h4>
              <ul>
                <li><a href="#">FAQ</a></li>
                <li><a href="#">Buchungen</a></li>
                <li><a href="/contact.html">Kontakt</a></li>
                <li><a href="/privacy.html">Datenschutz</a></li>
                <li><a href="/terms.html">AGB</a></li>
                <li><a href="#">Impressum</a></li>
              </ul>
            </div>
          </div>
          <div className="fbot">
            <p>© 2026 Airpiv GmbH · Alle Rechte vorbehalten</p>
            <p style={{ color: 'rgba(255,255,255,.18)', fontSize: 10, marginTop: 5, maxWidth: 600, lineHeight: 1.6 }}>Airpiv ist ein unabhängiger Vermittler von Reisedienstleistungen. Der Beförderungsvertrag kommt direkt zwischen dem Reisenden und der jeweiligen Fluggesellschaft zustande.</p>
            <div className="socs"><div className="soc">𝕏</div><div className="soc">f</div><div className="soc">in</div></div>
          </div>
        </div>
      </footer>

      {!cookieHidden && (
        <div className="ck" id="ck">
          <div className="ck-t">🍪 Wir verwenden <strong>technisch notwendige Cookies</strong> für den Betrieb der Website. Keine Tracking- oder Marketing-Cookies. <a href="/privacy.html">Datenschutz</a></div>
          <div className="ck-bs">
            <button type="button" className="ck-no" onClick={acceptCookies}>Nur notwendige</button>
            <button type="button" className="ck-ok" onClick={acceptCookies}>Alle akzeptieren ✓</button>
          </div>
        </div>
      )}

      <nav className="bnav">
        <div className="bn-wrap">
          <button type="button" className="bni on">
            <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.84 1.12 2 2 0 012.83 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L7.09 7.91a16 16 0 006.29 6.29l.97-.97a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" /></svg>
            <span>{c.bnav_flights}</span>
          </button>
          <button type="button" className="bni">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
            <span>{c.bnav_about}</span>
          </button>
          <button type="button" className="bni">
            <svg viewBox="0 0 24 24"><path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z" /><path d="M9 7h6M9 11h6M9 15h4" /></svg>
            <span>{c.bnav_bookings}</span>
          </button>
          <button type="button" className="bni">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" /></svg>
            <span>{c.bnav_help}</span>
          </button>
          <button type="button" className="bni">
            <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
            <span>{c.bnav_contact}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
