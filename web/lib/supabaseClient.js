'use client';

// Browser-side Supabase client — first real customer auth in this app
// (a completely separate system from the admin panel's httpOnly-cookie
// session; the two must never share a code path or storage, per the
// migration plan). Mirrors the old app.js's `_sb` client exactly: same
// project, same anon/publishable key (safe to ship to the browser —
// it was already public in the old app's checked-in config.js).
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tflpaysskecpmdpwbvog.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ZXi_Rq2zYQIj3LJoNFRctQ_eZogIGD0';

// A module-level singleton (not per-component) — same instance across
// the whole browser session, matching how `_sb` was a single global in
// app.js. Safe under React Strict Mode's double-invoke since module
// scope only runs once per page load.
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabase };
