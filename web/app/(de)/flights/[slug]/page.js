import { buildFlightRouteMetadata, FlightRoutePageBody } from '../../../../lib/render-flight-route';

export const revalidate = 3600;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  return buildFlightRouteMetadata(slug, 'de');
}

export default async function Page({ params }) {
  const { slug } = await params;
  return <FlightRoutePageBody slug={slug} lang="de" />;
}
