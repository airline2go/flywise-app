// [SOCIAL-STUDIO-PERSISTENCE] Server-only Supabase client using the service
// role, for the admin Social Studio's own tables (social_posts). It bypasses
// RLS, so it MUST never be imported into a Client Component or exposed to the
// browser — only Route Handlers / Server Components call it.
//
// Config (set in the environment, e.g. Vercel project settings):
//   SUPABASE_URL (or the existing NEXT_PUBLIC_SUPABASE_URL) — the project URL
//   SUPABASE_SERVICE_ROLE_KEY — the service-role secret (server-only, NOT
//   NEXT_PUBLIC). If unset, getSupabaseAdmin() returns null and callers degrade
//   gracefully (the feature reports it needs configuring rather than crashing).
import { createClient } from '@supabase/supabase-js';

let cached = null;

export function getSupabaseAdmin() {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cached = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}

export const SUPABASE_ADMIN_UNCONFIGURED =
  'حفظ المنشورات غير مُهيّأ: أضف SUPABASE_SERVICE_ROLE_KEY إلى متغيّرات البيئة لتفعيل الطابور.';
