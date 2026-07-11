'use client';

// Ports the real #results-page full-screen overlay exactly (same
// classes: .rp-header/.rp-tabs/.rp-body/.rp-filter-ov/.filter-section
// etc. from styles.css) — this is the ONLY results surface in this app
// (app.js's #rw/#offers-list inline section never actually showed once
// a later monkey-patch made #results-page load unconditionally on every
// search — see the B2 research notes; not replicated here).
//
// [SIMPLIFIED] The inline "edit search" dropdown (.rp-edit-drop, lets
// you tweak origin/dates without leaving the results page) is not
// ported in this pass — back button returns to the search homepage
// instead. Also not ported: per-card share button and the tap-to-expand
// segment detail sheet (openFlightSheet/.fdet).
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearch } from './SearchProvider';
import { useFlightSearch } from './useFlightSearch';
import OfferCard from './OfferCard';
import { sortOffers, applyFilters, defaultFilters, offerAirlineCodes, fmtPrice } from './offerUtils';

const PAGE_SIZE = 10;

export default function ResultsClient({ origin, destination, trip, departDate, returnDate }) {
  const router = useRouter();
  const search = useSearch();
  const mcLegs = search.mcLegs;
  const [sortMode, setSortMode] = useState('best');
  const [filters, setFilters] = useState(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [shown, setShown] = useState(PAGE_SIZE);

  const payload = useMemo(() => {
    if (trip === 'mc') {
      if (!mcLegs || mcLegs.length < 2 || mcLegs.some((l) => !l.origin || !l.destination || !l.date)) return null;
      return {
        slices: mcLegs.map((l) => ({ origin: l.origin.iata, destination: l.destination.iata, departure_date: l.date })),
        cabin_class: search.pax.cabin, adults: search.pax.adults, children: search.pax.children, infants: search.pax.infants,
      };
    }
    if (!origin || !destination || !departDate) return null;
    const p = {
      origin, destination, departure_date: departDate,
      cabin_class: search.pax.cabin, adults: search.pax.adults, children: search.pax.children, infants: search.pax.infants,
    };
    if (trip === 'rr' && returnDate) p.return_date = returnDate;
    return p;
  }, [trip, origin, destination, departDate, returnDate, mcLegs, search.pax]);

  const trackingParams = { origin, destination, departure_date: departDate, return_date: returnDate, trip_type: trip, ...search.pax };
  const { status, offers, error } = useFlightSearch(payload, trackingParams);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters(defaultFilters(offers));
      setShown(PAGE_SIZE);
    }, 0);
    return () => clearTimeout(t);
  }, [offers]);

  const paxCount = search.pax.adults + search.pax.children + search.pax.infants;
  const airlineOptions = useMemo(() => {
    const map = new Map();
    offers.forEach((o) => offerAirlineCodes(o).forEach((code) => { if (!map.has(code)) map.set(code, o.al[1] || code); }));
    return [...map.entries()];
  }, [offers]);

  const bestList = filters ? sortOffers(applyFilters(offers, filters), 'best') : [];
  const priceList = filters ? sortOffers(applyFilters(offers, filters), 'price') : [];
  const durList = filters ? sortOffers(applyFilters(offers, filters), 'dur') : [];
  const filtered = sortMode === 'best' ? bestList : sortMode === 'price' ? priceList : durList;

  function selectOffer(offer) {
    search.setSelectedOffer(offer);
    // Booking-flow entry lands in milestone B3.
  }

  const routeLabel = trip === 'mc'
    ? mcLegs.map((l) => l.origin?.iata).filter(Boolean).join(' → ')
    : `${origin} → ${destination}`;
  const metaLabel = trip === 'mc' ? '' : `${departDate ? new Date(departDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) : ''}${returnDate ? ' – ' + new Date(returnDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) : ''} · ${paxCount} Erw.`;

  return (
    <div id="results-page" className="open">
      {filterSheetOpen && filters && (
        <div className="rp-filter-ov open">
          <div className="rp-filter-sheet">
            <div className="rp-filter-handle" />
            <div className="rp-filter-hd">
              <h3>⚙️ Filter</h3>
              <button type="button" className="rp-filter-close" onClick={() => setFilterSheetOpen(false)}>✕</button>
            </div>
            <div className="rp-filter-body">
              <div className="filter-section">
                <div className="filter-section-title">Stopps</div>
                {[[0, 'Direktflug'], [1, '1 Stopp'], [2, '2+ Stopps']].map(([key, label]) => (
                  <div key={key} className="filter-check" onClick={() => setFilters({ ...filters, stops: { ...filters.stops, [key]: !filters.stops[key] } })}>
                    <div className="filter-check-left">
                      <div className={`filter-check-box${filters.stops[key] ? ' checked' : ''}`} />
                      <span className="filter-check-label">{label}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="filter-section">
                <div className="filter-section-title">Max. Preis</div>
                <div className="filter-price-row"><span>€0</span><span>{fmtPrice(filters.maxPrice)}</span></div>
                <input
                  type="range" min={0} max={filters.priceCeiling} value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: Number(e.target.value) })}
                  style={{ width: '100%', height: 6, borderRadius: 6, accentColor: '#00a991', cursor: 'pointer', margin: '8px 0' }}
                />
              </div>
              <div className="filter-section">
                <div className="filter-section-title">Abflugzeit</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[['early', '🌅', '00–06h'], ['morning', '☀️', '06–12h'], ['afternoon', '🌤', '12–18h'], ['evening', '🌙', '18–24h']].map(([key, icon, label]) => (
                    <button
                      key={key} type="button" className={`tcc${filters.timeOfDay[key] ? ' on' : ''}`}
                      onClick={() => setFilters({ ...filters, timeOfDay: { ...filters.timeOfDay, [key]: !filters.timeOfDay[key] } })}
                    >
                      <div>{icon}</div>{label}
                    </button>
                  ))}
                </div>
              </div>
              {airlineOptions.length > 1 && (
                <div className="filter-section">
                  <div className="filter-section-title">Airlines</div>
                  {airlineOptions.map(([code, name]) => (
                    <div key={code} className="filter-check" onClick={() => {
                      const current = filters.airlines || new Set(airlineOptions.map(([c]) => c));
                      const next = new Set(current);
                      if (next.has(code)) next.delete(code); else next.add(code);
                      setFilters({ ...filters, airlines: next });
                    }}>
                      <div className="filter-check-left">
                        <div className={`filter-check-box${(!filters.airlines || filters.airlines.has(code)) ? ' checked' : ''}`} />
                        <span className="filter-check-label">{name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rp-filter-foot">
              <button type="button" className="rp-filter-reset" onClick={() => setFilters(defaultFilters(offers))}>↺ Reset</button>
              <button type="button" className="rp-filter-apply" onClick={() => setFilterSheetOpen(false)}>✓ Anwenden</button>
            </div>
          </div>
        </div>
      )}

      <div className="rp-header">
        <div className="rp-header-top">
          <button type="button" className="rp-back" onClick={() => router.back()}>←</button>
          <div className="rp-title-wrap">
            <div className="rp-route">{routeLabel || '—'}</div>
            <div className="rp-meta">{metaLabel || '—'}</div>
          </div>
          <button type="button" className="rp-filter-btn" onClick={() => setFilterSheetOpen(true)}>⚙️</button>
        </div>

        {status === 'success' && (
          <div className="rp-tabs">
            <div className={`rp-tab${sortMode === 'best' ? ' on' : ''}`} onClick={() => setSortMode('best')}>
              <div className="rp-tab-label">⭐ Beste</div>
              <div className="rp-tab-price">{bestList[0] ? fmtPrice(bestList[0].price) : '—'}</div>
            </div>
            <div className={`rp-tab${sortMode === 'price' ? ' on' : ''}`} onClick={() => setSortMode('price')}>
              <div className="rp-tab-label">💰 Günstigste</div>
              <div className="rp-tab-price">{priceList[0] ? fmtPrice(priceList[0].price) : '—'}</div>
            </div>
            <div className={`rp-tab${sortMode === 'dur' ? ' on' : ''}`} onClick={() => setSortMode('dur')}>
              <div className="rp-tab-label">⚡ Schnellste</div>
              <div className="rp-tab-price">{durList[0] ? fmtPrice(durList[0].price) : '—'}</div>
            </div>
          </div>
        )}
      </div>

      <div className="rp-body">
        {status === 'success' && (
          <div className="rp-count-bar"><span className="rp-count-txt">{filtered.length} Flüge gefunden</span></div>
        )}

        {status === 'loading' && (
          <div style={{ textAlign: 'center', padding: '48px 16px' }}>
            <div className="lplane">✈️</div>
            <div className="ltxt">{trip === 'mc' ? 'Mehrere Städte werden gesucht...' : 'Suche die besten Verbindungen...'}</div>
            <div className="lsub">600+ Airlines werden durchsucht</div>
          </div>
        )}

        {status === 'error' && (
          <div className="ebox show">
            <div className="ein">⚠️ ❌ Server nicht erreichbar — {error}
              <button type="button" onClick={() => router.refresh()} style={{ display: 'block', margin: '12px auto 0', padding: '9px 18px', borderRadius: 10, border: 'none', background: 'var(--teal)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>🔄 Erneut versuchen</button>
            </div>
          </div>
        )}

        {status === 'empty' && (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--tx3)' }}>😕 Keine Flüge gefunden</div>
        )}

        {status === 'success' && (
          <div id="rp-offers-list">
            {filtered.slice(0, shown).map((offer, i) => (
              <OfferCard key={offer.id} offer={offer} index={i} isBestValue={i === 0 && sortMode === 'best'} onSelect={selectOffer} paxCount={paxCount} />
            ))}
          </div>
        )}

        {status === 'success' && shown < filtered.length && (
          <div style={{ textAlign: 'center', padding: '14px 0' }}>
            <button type="button" className="lm-btn" onClick={() => setShown((s) => s + PAGE_SIZE)}>Mehr Flüge anzeigen ↓</button>
          </div>
        )}
      </div>
    </div>
  );
}
