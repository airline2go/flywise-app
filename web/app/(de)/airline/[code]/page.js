import { buildAirlineMetadata, AirlinePageBody } from '../../../../lib/render-airline';

export const revalidate = 3600;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }) {
  const { code } = await params;
  return buildAirlineMetadata(code, 'de');
}

export default async function Page({ params }) {
  const { code } = await params;
  return <AirlinePageBody code={code} lang="de" />;
}
