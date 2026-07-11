'use client';

// Ports the genuinely cross-cutting slice of app.js's flat module-level
// search state (`PAX`, `trip`, `fromI`/`toI`/`fromC`/`toC`, `mcLegsData`)
// — the parts both the search form (B2) and the booking flow (B3+) need
// to agree on. Everything else that looked global in the old script
// purely because *all* of app.js's state was module-level (result-list
// sort mode, in-progress form field values, recent-searches UI list) is
// left as ordinary component state for the screens that actually own it
// — see the B1 research notes for the full global/local breakdown.
import { createContext, useContext, useEffect, useReducer } from 'react';

const PAX_STORAGE_KEY = 'fw_pax';

function defaultPax() {
  return { adults: 1, children: 0, infants: 0, checkedBags: 0, cabinBags: 1, cabin: 'economy' };
}

function loadCachedPax() {
  if (typeof window === 'undefined') return defaultPax();
  try {
    const cached = JSON.parse(localStorage.getItem(PAX_STORAGE_KEY) || 'null');
    return cached ? { ...defaultPax(), ...cached } : defaultPax();
  } catch {
    return defaultPax();
  }
}

const initialState = {
  trip: 'rr', // 'ow' | 'rr' | 'mc'
  pax: defaultPax(),
  origin: null, // {iata, city}
  destination: null, // {iata, city}
  departureDate: null,
  returnDate: null,
  mcLegs: [], // [{origin, destination, date}]
  selectedOffer: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE_PAX':
      return { ...state, pax: action.pax };
    case 'SET_TRIP':
      return { ...state, trip: action.trip };
    case 'SET_PAX':
      return { ...state, pax: { ...state.pax, ...action.pax } };
    case 'SET_ORIGIN':
      return { ...state, origin: action.airport };
    case 'SET_DESTINATION':
      return { ...state, destination: action.airport };
    case 'SET_DATES':
      return { ...state, departureDate: action.departureDate ?? state.departureDate, returnDate: action.returnDate ?? state.returnDate };
    case 'SET_MC_LEGS':
      return { ...state, mcLegs: action.legs };
    case 'SET_SELECTED_OFFER':
      return { ...state, selectedOffer: action.offer };
    case 'SWAP_ORIGIN_DESTINATION':
      return { ...state, origin: state.destination, destination: state.origin };
    default:
      return state;
  }
}

const SearchContext = createContext(null);

function SearchProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    dispatch({ type: 'HYDRATE_PAX', pax: loadCachedPax() });
  }, []);

  useEffect(() => {
    try { localStorage.setItem(PAX_STORAGE_KEY, JSON.stringify(state.pax)); } catch { /* storage may be unavailable (private mode) */ }
  }, [state.pax]);

  const value = {
    ...state,
    setTrip: (trip) => dispatch({ type: 'SET_TRIP', trip }),
    setPax: (pax) => dispatch({ type: 'SET_PAX', pax }),
    setOrigin: (airport) => dispatch({ type: 'SET_ORIGIN', airport }),
    setDestination: (airport) => dispatch({ type: 'SET_DESTINATION', airport }),
    setDates: (departureDate, returnDate) => dispatch({ type: 'SET_DATES', departureDate, returnDate }),
    setMcLegs: (legs) => dispatch({ type: 'SET_MC_LEGS', legs }),
    setSelectedOffer: (offer) => dispatch({ type: 'SET_SELECTED_OFFER', offer }),
    swapOriginDestination: () => dispatch({ type: 'SWAP_ORIGIN_DESTINATION' }),
  };

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used within SearchProvider');
  return ctx;
}

export { SearchProvider, useSearch };
