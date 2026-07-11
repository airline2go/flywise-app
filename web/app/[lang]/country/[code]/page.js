import { buildCountryMetadata, CountryPageBody } from '../../../../lib/render-country';

export const revalidate = 3600;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }) {
  const { lang, code } = await params;
  return buildCountryMetadata(code, lang);
}

export default async function Page({ params }) {
  const { lang, code } = await params;
  return <CountryPageBody code={code} lang={lang} />;
}
