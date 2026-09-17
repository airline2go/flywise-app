// Authority assets sitemap. Kept separate from the high-volume entity sitemaps
// so Search Console can diagnose authority/research assets independently.
const URLS = [
  'https://airpiv.com/research/flight-data',
  'https://airpiv.com/en/research/flight-data',
];

export const revalidate = 3600;

export async function GET() {
  const body = URLS.map((loc) => `  <url><loc>${loc}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}
