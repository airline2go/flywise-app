'use client';

// Ports the results-page behavior from app.js's initResults()/
// rebuildFilterPanels()/applyF()/sortBy() — one clean page instead of
// the old code's two parallel results containers (#rw/#offers-list and
// the #results-page overlay that ended up being the only one users
// actually saw, per the B2 research notes — not replicated here, this
// component IS the results page).
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearch } from './SearchProvider';
import { useFlightSearch } from './useFlightSearch';
import OfferCard from './OfferCard';
import { sortOffers, applyFilters, defaultFilters, offerAirlineCodes } from './offerUtils';

const PAGE_SIZE = 10;

export default function ResultsClient({ origin, destination, trip, departDate, returnDate, t }) {
  const router = useRouter();
  const search = useSearch();
  const mcLegs = search.mcLegs;
  const [sortMode, setSortMode] = useState('best');
  const [filters, setFilters] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  const filtered = filters ? sortOffers(applyFilters(offers, filters), sortMode) : [];

  function retry() {
    router.refresh();
  }

  function selectOffer(offer) {
    search.setSelectedOffer(offer);
    // Booking-flow entry lands in milestone B3 — for now this just
    // records the pick so B3 has somewhere to read it from.
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>
            {trip === 'mc' ? t.tripMultiCity : `${origin} → ${destination}`}
          </div>
          {status === 'success' && <div style={{ fontSize: 12.5, color: 'var(--tx3)' }}>{filtered.length} {paxCount > 1 ? `· ${paxCount} Pax` : ''}</div>}
        </div>
        {status === 'success' && (
          <div style={{ display: 'flex', gap: 6 }}>
            {[['best', 'Beste'], ['price', 'Preis'], ['dur', 'Dauer']].map(([mode, label]) => (
              <button key={mode} type="button" onClick={() => setSortMode(mode)} style={sortMode === mode ? activeTabStyle : tabStyle}>{label}</button>
            ))}
            <button type="button" onClick={() => setFiltersOpen((v) => !v)} style={tabStyle}>⚙️</button>
          </div>
        )}
      </div>

      {filtersOpen && filters && (
        <FilterPanel filters={filters} onChange={setFilters} airlineOptions={airlineOptions} />
      )}

      {status === 'loading' && <LoadingState trip={trip} />}
      {status === 'error' && <ErrorState message={error} onRetry={retry} />}
      {status === 'empty' && <EmptyState />}
      {status === 'idle' && <EmptyState message="—" />}

      {status === 'success' && (
        <>
          {filtered.slice(0, shown).map((offer, i) => (
            <OfferCard key={offer.id} offer={offer} isBestValue={i === 0 && sortMode === 'best'} onSelect={selectOffer} paxCount={paxCount} />
          ))}
          {shown < filtered.length && (
            <button type="button" onClick={() => setShown((s) => s + PAGE_SIZE)} style={loadMoreStyle}>Mehr Flüge anzeigen ↓</button>
          )}
        </>
      )}
    </div>
  );
}

function FilterPanel({ filters, onChange, airlineOptions }) {
  function toggleStop(key) {
    onChange({ ...filters, stops: { ...filters.stops, [key]: !filters.stops[key] } });
  }
  function toggleTime(key) {
    onChange({ ...filters, timeOfDay: { ...filters.timeOfDay, [key]: !filters.timeOfDay[key] } });
  }
  function toggleAirline(code) {
    const current = filters.airlines || new Set(airlineOptions.map(([c]) => c));
    const next = new Set(current);
    if (next.has(code)) next.delete(code); else next.add(code);
    onChange({ ...filters, airlines: next });
  }
  return (
    <div style={filterPanelStyle}>
      <div style={filterGroupStyle}>
        <span style={filterLabelStyle}>Stopps</span>
        {[[0, 'Direkt'], [1, '1 Stopp'], [2, '2+ Stopps']].map(([key, label]) => (
          <label key={key} style={checkLabelStyle}>
            <input type="checkbox" checked={filters.stops[key]} onChange={() => toggleStop(key)} /> {label}
          </label>
        ))}
      </div>
      <div style={filterGroupStyle}>
        <span style={filterLabelStyle}>Abflugzeit</span>
        {[['early', '00-06'], ['morning', '06-12'], ['afternoon', '12-18'], ['evening', '18-24']].map(([key, label]) => (
          <label key={key} style={checkLabelStyle}>
            <input type="checkbox" checked={filters.timeOfDay[key]} onChange={() => toggleTime(key)} /> {label}
          </label>
        ))}
      </div>
      <div style={filterGroupStyle}>
        <span style={filterLabelStyle}>Max. Preis: €{filters.maxPrice}</span>
        <input type="range" min={0} max={filters.priceCeiling} step={10} value={filters.maxPrice} onChange={(e) => onChange({ ...filters, maxPrice: Number(e.target.value) })} style={{ width: '100%' }} />
      </div>
      {airlineOptions.length > 1 && (
        <div style={filterGroupStyle}>
          <span style={filterLabelStyle}>Airlines</span>
          {airlineOptions.map(([code, name]) => (
            <label key={code} style={checkLabelStyle}>
              <input type="checkbox" checked={!filters.airlines || filters.airlines.has(code)} onChange={() => toggleAirline(code)} /> {name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingState({ trip }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 16px' }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>✈️</div>
      <div style={{ fontSize: 14, color: 'var(--tx2)' }}>
        {trip === 'mc' ? 'Mehrere Städte werden gesucht…' : 'Suche die besten Verbindungen…'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
        {[1, 2, 3].map((i) => <div key={i} style={skeletonCardStyle} />)}
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--tx2)' }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>😕</div>
      <div>{message || 'Keine Flüge gefunden — versuch andere Daten oder Filter.'}</div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--rd)' }}>
      <div style={{ marginBottom: 10 }}>❌ Server nicht erreichbar — {message}</div>
      <button type="button" onClick={onRetry} style={retryBtnStyle}>🔄 Erneut versuchen</button>
    </div>
  );
}

const pageStyle = { maxWidth: 760, margin: '0 auto', padding: '16px 20px 60px' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 };
const tabStyle = { padding: '7px 12px', borderRadius: 20, border: '1px solid var(--bd)', background: 'var(--bg)', color: 'var(--tx2)', fontSize: 12.5, cursor: 'pointer' };
const activeTabStyle = { ...tabStyle, background: 'var(--teal)', color: '#fff', borderColor: 'var(--teal)', fontWeight: 700 };
const loadMoreStyle = { width: '100%', padding: '12px 0', borderRadius: 'var(--r-sm)', border: '1px solid var(--bd)', background: 'var(--bg)', color: 'var(--tx)', fontSize: 13.5, cursor: 'pointer', marginTop: 6 };
const retryBtnStyle = { padding: '9px 18px', borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--teal)', color: '#fff', fontWeight: 700, cursor: 'pointer' };
const skeletonCardStyle = { height: 96, borderRadius: 'var(--r)', background: 'linear-gradient(90deg, var(--bg2) 25%, var(--bd) 50%, var(--bg2) 75%)', backgroundSize: '200% 100%', animation: 'fw-shimmer 1.4s infinite' };
const filterPanelStyle = { display: 'flex', flexWrap: 'wrap', gap: 20, padding: 16, marginBottom: 16, background: 'var(--bg2)', borderRadius: 'var(--r)', border: '1px solid var(--bd)' };
const filterGroupStyle = { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 130 };
const filterLabelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--tx2)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 };
const checkLabelStyle = { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--tx)' };
