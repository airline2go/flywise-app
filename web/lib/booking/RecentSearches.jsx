'use client';

// Ports app.js's #recent-searches quick-pick chip (renderRecentSearches +
// doQuickSearch / doQuickSearchMC). Shows the single most-recent search for
// the current trip mode; tapping it re-runs that search. Same markup
// (.recent-title / .recent-chip / .recent-date) as the original.
//
// localStorage is read after mount (never during SSR) so the server render
// stays empty and there's no hydration mismatch — matching the original,
// where the chip only appears client-side once a prior search exists.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearch } from './SearchProvider';
import { readMostRecentSearch, readMostRecentSearchMC } from './recentSearches';

export default function RecentSearches({ lang, ls }) {
  const router = useRouter();
  const search = useSearch();
  const trip = search.trip;
  const [recent, setRecent] = useState(null); // { kind:'std', data } | { kind:'mc', data } | null

  useEffect(() => {
    // Deferred setState (codebase-wide pattern) to avoid the synchronous
    // cascading-render lint rule; the read only happens client-side.
    const t = setTimeout(() => {
      if (trip === 'mc') {
        const mc = readMostRecentSearchMC();
        setRecent(mc ? { kind: 'mc', data: mc } : null);
      } else {
        const std = readMostRecentSearch();
        setRecent(std ? { kind: 'std', data: std } : null);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [trip]);

  function resultsPath(pair) {
    const prefix = lang === 'de' ? '' : `/${lang}`;
    return `${prefix}/search/${pair}`;
  }

  // Ports doQuickSearch(): restore the fields into search state (so a return
  // to the homepage shows them pre-filled) and navigate to the results.
  function quickSearch(s) {
    const isRr = !!s.ret;
    search.setOrigin({ iata: s.orig, city: s.origC || s.orig, name: s.origC || s.orig, country: '' });
    search.setDestination({ iata: s.dest, city: s.destC || s.dest, name: s.destC || s.dest, country: '' });
    search.setTrip(isRr ? 'rr' : 'ow');
    search.setDates(s.dep || null, isRr ? (s.ret || null) : null);
    const params = new URLSearchParams({ trip: isRr ? 'rr' : 'ow', depart: s.dep || '' });
    if (isRr && s.ret) params.set('return', s.ret);
    router.push(`${resultsPath(`${s.orig}-${s.dest}`)}?${params.toString()}`);
  }

  // Ports doQuickSearchMC(): rebuild the multi-city legs into search state
  // and navigate to the multi-city results route.
  function quickSearchMC(mc) {
    const legs = mc.legs.map((l) => ({
      origin: { iata: l.orig, city: l.origC || l.orig, name: l.origC || l.orig, country: '' },
      destination: { iata: l.dest, city: l.destC || l.dest, name: l.destC || l.dest, country: '' },
      date: l.dep,
    }));
    search.setMcLegs(legs);
    router.push(resultsPath('multi-city'));
  }

  if (!recent) return <div id="recent-searches" style={{ display: 'none' }} />;

  if (recent.kind === 'mc') {
    const legs = recent.data.legs;
    const route = legs.map((l) => l.origC || l.orig).join(' → ') + ' → ' + (legs[legs.length - 1].destC || legs[legs.length - 1].dest);
    return (
      <div id="recent-searches" style={{ display: 'block' }}>
        <div className="recent-title">{ls.recent_title}</div>
        <div className="recent-chip" data-mc="1" onClick={() => quickSearchMC(recent.data)}>
          <span>✈ {route}</span>
          <span className="recent-date">{legs[0].dep || ''}</span>
        </div>
      </div>
    );
  }

  const s = recent.data;
  return (
    <div id="recent-searches" style={{ display: 'block' }}>
      <div className="recent-title">{ls.recent_title}</div>
      <div className="recent-chip" onClick={() => quickSearch(s)}>
        <span>✈ {s.origC || s.orig} → {s.destC || s.dest}</span>
        <span className="recent-date">{s.dep || ''}</span>
      </div>
    </div>
  );
}
