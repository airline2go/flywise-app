'use client';

// Ports app.js's loyaltyData/loyaltyLoad()/loyaltySave()/
// loyaltySyncFromServer(): instant-paint from a localStorage cache, then
// overwritten by the authoritative server value (GET /auth/me) whenever
// auth state changes. The authoritative points/credit ledger lives
// server-side (loyalty.routes.js / loyalty_transactions) — this
// provider only ever displays what the server last reported, it never
// computes point/credit math itself (app.js's old
// loyaltyEarnPoints()/loyaltyRedeemCredit() did optimistic client-side
// math that could drift from the server; not ported — server-sync
// always wins here instead).
//
// [NOT-PORTED] loyaltyDeviceId()/loyaltySyncFromServerByDevice() — the
// device-id fallback path for anonymous (logged-out) loyalty tracking
// was dead code in app.js (the "by device" sync function it fed into
// was a no-op stub). Logged-out visitors simply see the zeroed default
// state here, matching what actually happened in production.
import { createContext, useContext, useEffect, useReducer } from 'react';
import { useAuth } from './AuthProvider';
import { fetchMe } from '../booking-api';

const LOYALTY_STORAGE_KEY = 'fw_loyalty';

const LOYALTY = {
  POINTS_PER_EURO: 2,
  WELCOME_POINTS: 100,
  WELCOME_CREDIT: 10,
  MAX_CREDIT_PER_BOOKING: 5,
  POINTS_PER_EURO_REDEEM: 400,
  TIERS: {
    bronze: { name: 'Bronze', min: 0, max: 3999, multiplier: 1, icon: '🥉', color: '#cd7f32', supportLabel: 'Standard' },
    silver: { name: 'Silver', min: 4000, max: 9999, multiplier: 1.5, icon: '🥈', color: '#a8a9ad', supportLabel: 'Priority', coupon: 20 },
    gold: { name: 'Gold', min: 10000, max: Infinity, multiplier: 2, icon: '🥇', color: '#ffd700', supportLabel: 'VIP', coupon: 100 },
  },
};

function defaultLoyaltyData() {
  return { points: 0, lifetimePoints: 0, credit: 0, tier: 'bronze', bookings: 0, creditUsed: 0 };
}

function loadCached() {
  if (typeof window === 'undefined') return defaultLoyaltyData();
  try {
    const cached = JSON.parse(localStorage.getItem(LOYALTY_STORAGE_KEY) || 'null');
    return cached ? { ...defaultLoyaltyData(), ...cached } : defaultLoyaltyData();
  } catch {
    return defaultLoyaltyData();
  }
}

function saveCached(data) {
  try { localStorage.setItem(LOYALTY_STORAGE_KEY, JSON.stringify(data)); } catch { /* storage may be unavailable (private mode) */ }
}

const initialState = { data: defaultLoyaltyData(), initialized: false, justInitialized: false };

function reducer(state, action) {
  if (action.type === 'HYDRATE_CACHE') return { ...state, data: action.data };
  if (action.type === 'SERVER_SYNC') {
    const wasInitialized = state.initialized;
    return { data: action.data, initialized: true, justInitialized: !wasInitialized };
  }
  if (action.type === 'RESET') return { data: defaultLoyaltyData(), initialized: false, justInitialized: false };
  return state;
}

const LoyaltyContext = createContext(null);

function LoyaltyProvider({ children }) {
  const { isAuthenticated, status } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);

  // Instant-paint from the last-known cache, once, on mount.
  useEffect(() => {
    dispatch({ type: 'HYDRATE_CACHE', data: loadCached() });
  }, []);

  useEffect(() => {
    if (status !== 'ready') return;
    if (!isAuthenticated) { dispatch({ type: 'RESET' }); return; }
    let cancelled = false;
    fetchMe().then(({ ok, data }) => {
      if (cancelled || !ok || !data.loyalty) return;
      const next = {
        points: data.loyalty.points,
        lifetimePoints: data.loyalty.lifetime_points != null ? data.loyalty.lifetime_points : data.loyalty.points,
        credit: data.loyalty.credit,
        tier: data.loyalty.tier,
        bookings: 0,
        creditUsed: 0,
      };
      dispatch({ type: 'SERVER_SYNC', data: next });
      saveCached(next);
    });
    return () => { cancelled = true; };
  }, [status, isAuthenticated]);

  const value = {
    ...state.data,
    initialized: state.initialized,
    justInitialized: state.justInitialized,
    constants: LOYALTY,
  };

  return <LoyaltyContext.Provider value={value}>{children}</LoyaltyContext.Provider>;
}

function useLoyalty() {
  const ctx = useContext(LoyaltyContext);
  if (!ctx) throw new Error('useLoyalty must be used within LoyaltyProvider');
  return ctx;
}

export { LoyaltyProvider, useLoyalty, LOYALTY };
