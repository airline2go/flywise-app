// [SEO-STORAGE] Server-only Supabase client for the SEO opportunity snapshots
// table. Uses the SERVICE-ROLE key (never the anon key, which is public in
// public/config.js) so writes bypass RLS — and the table has NO anon policies,
// so ONLY these admin-gated server routes can read/write it. Never import this
// from a Client Component: the service-role key must never reach the browser.
//
// Degrades gracefully: when the service-role key isn't configured in the
// deployment env, getServiceClient() returns null and the callers fall back to
// the browser-local (localStorage) behavior instead of erroring.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

let cached = null;

export function isStorageConfigured() {
  return !!(SUPABASE_URL && SERVICE_KEY);
}

export function getServiceClient() {
  if (!isStorageConfigured()) return null;
  if (!cached) {
    cached = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

export const SNAPSHOT_TABLE = 'seo_gsc_snapshots';
