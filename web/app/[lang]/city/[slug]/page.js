import { buildCityMetadata, CityPageBody } from '../../../../lib/render-city';

export const revalidate = 3600;

// [ON-DEMAND-GENERATION] See app/(de)/city/[slug]/page.js's comment —
// same reasoning applies per-language here.
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }) {
  const { lang, slug } = await params;
  return buildCityMetadata(slug, lang);
}

export default async function Page({ params }) {
  const { lang, slug } = await params;
  return <CityPageBody slug={slug} lang={lang} />;
}
