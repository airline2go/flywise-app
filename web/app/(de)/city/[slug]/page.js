import { buildCityMetadata, CityPageBody } from '../../../../lib/render-city';

// [ISR] Time-based revalidation — see the migration plan's rationale for
// shipping this as the Phase 1 default rather than blocking on building
// on-demand revalidation first.
export const revalidate = 3600;

// [ON-DEMAND-GENERATION] Deliberately returns no paths — this is the
// entire point of the migration: the old build/generate-pages.js
// pre-rendered every single page on every deploy (the source of the 429
// incident and the scaling ceiling this migration exists to remove).
// Returning [] here means zero pages are pre-built at deploy time; each
// page renders once on its first real visit, then serves from cache and
// silently revalidates in the background every `revalidate` seconds.
// dynamicParams defaults to true, so any valid slug not yet visited still
// renders on-demand rather than 404ing.
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  return buildCityMetadata(slug, 'de');
}

export default async function Page({ params }) {
  const { slug } = await params;
  return <CityPageBody slug={slug} lang="de" />;
}
