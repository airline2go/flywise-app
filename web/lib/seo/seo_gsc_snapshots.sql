-- [SEO-STORAGE] Schema for the persisted SEO opportunity report snapshots.
-- Applied to the Supabase project (public schema). Recorded here for review /
-- reproducibility — the app reaches this table only through the admin-gated,
-- service-role server routes in app/admin/api/seo-opportunities/snapshot/.
--
-- RLS is ON with NO anon/authenticated policies: anon/authenticated are denied
-- entirely, and only the service_role (server) bypasses RLS. The anon key is
-- public (public/config.js), so it must never be able to touch this table.

create table if not exists public.seo_gsc_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null default 'csv',          -- 'csv' (manual import) | 'api' (future live GSC feed)
  file_name text,
  date_range text,
  row_count integer not null default 0,
  rows jsonb not null default '[]'::jsonb,      -- the computed opportunity-report rows
  uploaded_by text
);

create index if not exists seo_gsc_snapshots_created_at_idx
  on public.seo_gsc_snapshots (created_at desc);

alter table public.seo_gsc_snapshots enable row level security;
