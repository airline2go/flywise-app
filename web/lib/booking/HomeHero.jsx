'use client';

// Ports index.html's real hero + service-tabs + search-card + trust-bar
// markup exactly (same classes from styles.css). switchSvcTab()'s
// coming-soon behavior for hotels/cars/insurance is preserved — only
// "flights" is a real destination in this app.
//
// switchSvcTab()'s coming-soon behavior for hotels/cars/insurance is
// preserved — only "flights" is a real destination in this app. The
// #recent-searches quick-pick chip is wired via <RecentSearches>.
import { useState } from 'react';
import SearchForm from './SearchForm';
import RecentSearches from './RecentSearches';
import FlexHint from './FlexHint';
import HomeSections from './HomeSections';
import PopularRoutes from './PopularRoutes';
import { LEGACY_STRINGS } from './legacyStrings';

const SVC_TABS = [
  { id: 'flights', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 2L8 6H5L3 8l4 2-2 4 2 1 3-3 4 2 2-2-2-5 4-2-2-2h-3z" /></svg> },
  { id: 'hotels', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>, emoji: '🏨' },
  { id: 'cars', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" /><path d="M3 11h18v4a1 1 0 0 1-1 1h-1v1a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-1H3v-4z" /><circle cx="7.5" cy="14.5" r="1.3" /><circle cx="16.5" cy="14.5" r="1.3" /></svg>, emoji: '🚗' },
  { id: 'insurance', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>, emoji: '🛡️' },
];

export default function HomeHero({ lang }) {
  const ls = LEGACY_STRINGS[lang] || LEGACY_STRINGS.de;
  const [activeSvc, setActiveSvc] = useState('flights');

  return (
    <>
      <div className="hero">
        <div className="hero-wrap">
        <div className="hero-pill"><span className="dot" />{ls.hero_pill}</div>
        <h1>{ls.hero_title1}<br />{ls.hero_title2} <span>{ls.hero_title_span}</span></h1>
        <p className="hero-sub">{ls.hero_sub}</p>
        <RecentSearches lang={lang} ls={ls} />

        <div className="svc-tabs">
          {SVC_TABS.map((tab) => (
            <button
              key={tab.id} type="button"
              className={`svc-tab${activeSvc === tab.id ? ' active' : ''}`}
              onClick={() => setActiveSvc(tab.id)}
            >
              {tab.icon}
              <span>{ls[`tab_${tab.id}`]}</span>
            </button>
          ))}
        </div>

        {activeSvc !== 'flights' ? (
          <div className="scard">
            <div className="coming-soon-msg show">
              <div className="coming-soon-icon">{SVC_TABS.find((t) => t.id === activeSvc).emoji}</div>
              <div className="coming-soon-title">{ls.coming_soon_title}</div>
              <div className="coming-soon-sub">{ls[`coming_soon_${activeSvc}`]}</div>
            </div>
          </div>
        ) : (
          <SearchForm lang={lang} ls={ls} />
        )}

        <FlexHint ls={ls} />
      </div>

      <div className="trust">
        <div className="trust-in">
          <div className="ti-badge" title="256-bit SSL Verschlüsselung">🔒 SSL Sicher</div>
          <div className="ti-badge" title="Datenschutz nach EU-Standard">🇪🇺 Datenschutzfreundlich gemäß EU-Richtlinien</div>
          <div className="tdiv" />
          <div className="ti">⚡ Sofort-Bestätigung</div><div className="tdiv" />
          <div className="ti">💰 Bestpreisgarantie</div><div className="tdiv" />
          <div className="ti">🛡 Airpiv Garantie</div><div className="tdiv" />
          <div className="ti">🌐 600+ Airlines</div>
        </div>
      </div>
      </div>

      <HomeSections lang={lang} />
      <PopularRoutes lang={lang} />
    </>
  );
}
