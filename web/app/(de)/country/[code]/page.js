import { buildCountryMetadata, CountryPageBody } from '../../../../lib/render-country';

export const revalidate = 3600;

// [ON-DEMAND-GENERATION] See app/(de)/city/[slug]/page.js's comment.
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }) {
  const { code } = await params;
  return buildCountryMetadata(code, 'de');
}

export default async function Page({ params }) {
  const { code } = await params;
  return <CountryPageBody code={code} lang="de" />;
}
