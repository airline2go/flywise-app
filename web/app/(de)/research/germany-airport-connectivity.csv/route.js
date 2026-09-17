import { listRoutePages } from '@/lib/content-api.js';

export const revalidate = 3600;

const columns = [
  'origin_iata',
  'origin_city',
  'origin_country',
  'destination_iata',
  'destination_city',
  'destination_country',
  'slug',
  'airline_count',
  'route_score',
  'distance_km',
  'updated_at',
];

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET() {
  const routes = await listRoutePages();
  const rows = (Array.isArray(routes) ? routes : [])
    .filter((route) => String(route.origin_country || '').trim().toUpperCase() === 'DE')
    .map((route) => columns.map((column) => csvCell(route[column])).join(','));

  const body = [columns.join(','), ...rows].join('\n') + '\n';
  return new Response(body, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'inline; filename="airpiv-germany-airport-connectivity.csv"',
      'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      'x-robots-tag': 'noindex',
    },
  });
}
