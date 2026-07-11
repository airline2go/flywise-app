import { buildAirportMetadata, AirportPageBody } from '../../../../lib/render-airport';

export const revalidate = 3600;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }) {
  const { lang, code } = await params;
  return buildAirportMetadata(code, lang);
}

export default async function Page({ params }) {
  const { lang, code } = await params;
  return <AirportPageBody code={code} lang={lang} />;
}
