'use client';

// Live/authenticated sibling to content-api.js — these calls are never
// ISR-cached (search results, account state, and money all need to be
// fresh every time), and unlike the admin panel this hits flywise-server
// directly from the browser (no httpOnly-cookie/Route-Handler-proxy
// layer needed — CORS on flywise-server already allowlists this origin,
// same call pattern app.js always used against `PROXY`).
import { supabase } from './supabaseClient';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.airpiv.com';

// Every authenticated call in the old app.js re-derived the bearer
// header from a fresh `getSession()` call rather than reading a cached
// token from storage (Supabase keeps the session fresh/auto-refreshed
// in memory + localStorage, so this is cheap) — ported verbatim as the
// one shared helper instead of the 7 duplicated copies it used to be.
async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data && data.session && data.session.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function bookingFetch(path, options = {}) {
  const auth = options.skipAuth ? {} : await authHeader();
  const headers = { 'Content-Type': 'application/json', ...auth, ...(options.headers || {}) };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, cache: 'no-store' });
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected response' }));
  return { ok: res.ok && data.ok !== false, status: res.status, data };
}

// ─── Auth-adjacent ──────────────────────────────────────────────────────

// Loyalty state only (points/credit/tier) — identity comes from the
// Supabase session itself, not this endpoint (matches app.js exactly:
// `/auth/me` is never used for name/email).
async function fetchMe() {
  return bookingFetch('/auth/me');
}

async function linkGuestBookings() {
  return bookingFetch('/auth/link-guest-bookings', { method: 'POST' });
}

async function fetchMyBookings() {
  return bookingFetch('/my-bookings');
}

// ─── Search ─────────────────────────────────────────────────────────────

async function searchAirports(query) {
  return bookingFetch(`/search/airports?q=${encodeURIComponent(query)}`, { skipAuth: true });
}

// `payload` is either the simple shape ({origin, destination, departure_date,
// return_date?, cabin_class, adults, children, infants}) or the multi-city
// shape ({slices: [{origin, destination, departure_date}, ...], cabin_class,
// adults, children, infants}) — server infers multi-city purely from the
// presence of `slices`, so no separate flag is sent (the old client's
// `multi_city: true` field was dead on the wire, confirmed against
// search.routes.js — not ported). cabin_bags/checked_bags are also not
// sent here: the server's POST /search never reads them (bag counts only
// matter at booking/pricing time), so app.js was sending them for nothing.
async function search(payload) {
  return bookingFetch('/search', { method: 'POST', body: JSON.stringify(payload), skipAuth: true });
}

export { API_BASE, authHeader, bookingFetch, fetchMe, linkGuestBookings, fetchMyBookings, searchAirports, search };
