// Server-side authenticated fetch helper for flywise-server's /admin/*
// endpoints. This is the admin-panel sibling of ../content-api.js — that
// one is unauthenticated-GET-only and ISR-cached, this one is always
// live (`cache: 'no-store'`) and carries the admin bearer token.
//
// [ADMIN-AUTH-COOKIE] The token lives in an httpOnly cookie, never in
// page JS — unlike the old admin.js, which kept it in sessionStorage
// (readable by any script on the page). A cookie set here is invisible
// to the browser's JS; only this server-side helper (and the Route
// Handlers that call it) ever read the raw token. flywise-server itself
// has no cookie concept — it only ever sees a plain
// `Authorization: Bearer <token>` header, exactly as before.
import { cookies } from 'next/headers';

const API_BASE = process.env.API_BASE || 'https://api.airpiv.com';

const ADMIN_TOKEN_COOKIE = 'airpiv_admin_token';
const ADMIN_ROLE_COOKIE = 'airpiv_admin_role';
const ADMIN_NAME_COOKIE = 'airpiv_admin_name';

// Cookie options shared by every cookie this module sets — 12h expiry
// (matches how long an admin session realistically needs to last for a
// single working session, not indefinite like a "remember me").
const COOKIE_MAX_AGE = 60 * 60 * 12;

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  };
}

// Reads the current admin session from cookies (Server Component, Route
// Handler, or Server Function context only — cookies() is unavailable
// elsewhere). Returns null if not logged in.
async function getAdminSession() {
  const store = await cookies();
  const token = store.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return {
    token,
    role: store.get(ADMIN_ROLE_COOKIE)?.value || 'staff',
    name: store.get(ADMIN_NAME_COOKIE)?.value || null,
  };
}

// Sets the session cookies after a successful /admin/login or
// /admin/staff-login call. Only callable from a Route Handler or Server
// Function (cookies().set() requirement — see Next's cookies() docs).
async function setAdminSession({ token, role, name }) {
  const store = await cookies();
  const opts = cookieOptions();
  store.set(ADMIN_TOKEN_COOKIE, token, opts);
  store.set(ADMIN_ROLE_COOKIE, role || 'staff', opts);
  if (name) store.set(ADMIN_NAME_COOKIE, name, opts);
}

async function clearAdminSession() {
  const store = await cookies();
  store.delete(ADMIN_TOKEN_COOKIE);
  store.delete(ADMIN_ROLE_COOKIE);
  store.delete(ADMIN_NAME_COOKIE);
}

// Calls a flywise-server /admin/* endpoint with the current session's
// bearer token attached. Returns the raw Response — callers decide how
// to handle a non-ok status (a Server Component page should usually
// redirect() to /admin/login on 401; a Route Handler proxy should
// usually just forward the status+body to the client, matching the old
// adminFetch()'s "centrally handle 401" behavior but on the client side
// of that proxy instead, since a raw fetch() from a Client Component
// can't call redirect() itself).
async function adminFetch(path, options = {}) {
  const session = await getAdminSession();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (session) headers.Authorization = `Bearer ${session.token}`;
  return fetch(`${API_BASE}${path}`, { ...options, headers, cache: 'no-store' });
}

export { adminFetch, getAdminSession, setAdminSession, clearAdminSession, API_BASE };
