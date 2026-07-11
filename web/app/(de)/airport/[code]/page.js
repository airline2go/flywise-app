import { buildAirportMetadata, AirportPageBody } from '../../../../lib/render-airport';

export const revalidate = 3600;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }) {
  const { code } = await params;
  return buildAirportMetadata(code, 'de');
}

export default async function Page({ params }) {
  const { code } = await params;
  return <AirportPageBody code={code} lang="de" />;
}
