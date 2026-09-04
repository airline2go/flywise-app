// [HREFLANG-AUDIT] Live hreflang-cluster consistency audit. Complements
// audit-sitemap.mjs (which checks sitemap↔indexability): this checks that every
// sampled page emits a VALID hreflang cluster — self return-tag, canonical among
// the alternates, x-default present, no duplicate code — and, on a smaller
// sub-sample, real RECIPROCITY: the page's own-language and English alternates
// resolve to 200 and point back into the same cluster.
//
// It samples a spread across every child sitemap (routes, cities, countries,
// airports, airlines, blog, pages), so a per-type hreflang regression (e.g. the
// per-language-slug blog cluster) surfaces with evidence.
//
// Usage:
//   node scripts/audit-hreflang.mjs [--base=https://airpiv.com] [--sample=8]
//        [--json] [--timeout=20000]
// Exit: 0 clean · 1 a cluster/reciprocity violation · 2 sitemap undiscoverable.

import { auditHreflangCluster, parseHreflang } from '../lib/seo/hreflang-audit.mjs';

const UA = 'AirpivHreflangAudit/1.0 (+https://airpiv.com; hreflang consistency check)';
const LANGS = ['de', 'en', 'ar', 'es', 'fr', 'it', 'nl', 'tr'];
const DEFAULT_LANG = 'de';

function parseArgs(argv) {
  const args = { base: 'https://airpiv.com', sample: 8, json: false, timeout: 20000 };
  for (const a of argv) {
    if (a === '--json') args.json = true;
    else if (a.startsWith('--base=')) args.base = a.slice(7).replace(/\/$/, '');
    else if (a.startsWith('--sample=')) args.sample = Math.max(1, parseInt(a.slice(9), 10) || 8);
    else if (a.startsWith('--timeout=')) args.timeout = Math.max(1000, parseInt(a.slice(10), 10) || 20000);
  }
  return args;
}

async function fetchText(url, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; } finally { clearTimeout(timer); }
}

async function fetchStatusHtml(url, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'manual' });
    return { status: res.status, html: res.status === 200 ? await res.text() : '' };
  } catch (e) {
    return { status: 0, html: '', error: e.message };
  } finally { clearTimeout(timer); }
}

const locs = (xml) => [...(xml.match(/<loc>([^<]+)<\/loc>/g) || [])].map((m) => m.replace(/<\/?loc>/g, '').trim());

// The page's served language = the first path segment when it is a non-default
// language code, else the default (German at the root).
function langOf(url) {
  const seg = new URL(url).pathname.split('/').filter(Boolean)[0];
  return LANGS.includes(seg) && seg !== DEFAULT_LANG ? seg : DEFAULT_LANG;
}

// Even spread of n items across an array.
function spread(arr, n) {
  if (arr.length <= n) return arr.slice();
  const step = arr.length / n;
  return Array.from({ length: n }, (_, i) => arr[Math.floor(i * step)]);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const index = await fetchText(`${args.base}/sitemap.xml`, args.timeout);
  if (!index) { console.error('sitemap index undiscoverable'); process.exit(2); }
  const childSitemaps = locs(index);

  const problems = [];
  let checked = 0;
  let reciprocityChecked = 0;

  for (const sm of childSitemaps) {
    const xml = await fetchText(sm, args.timeout);
    if (!xml) { problems.push({ url: sm, errors: ['child sitemap unreachable'] }); continue; }
    // The static marketing/legal pages (sitemap-pages) are single-language by
    // design — they self-canonical and carry no hreflang, which is valid.
    const allowSingleLanguage = /sitemap-pages/.test(sm);
    const sample = spread(locs(xml), args.sample);
    for (const pageUrl of sample) {
      const { status, html } = await fetchStatusHtml(pageUrl, args.timeout);
      if (status !== 200) { problems.push({ url: pageUrl, errors: [`page returned ${status}`] }); continue; }
      checked++;
      const errors = auditHreflangCluster({ html, pageUrl, expectedLang: langOf(pageUrl), allowSingleLanguage });

      // Reciprocity on the first page of each child: fetch each alternate and
      // require it 200 and carry the SAME canonical-cluster URL for this lang.
      if (sample.indexOf(pageUrl) === 0) {
        const { alternates } = parseHreflang(html);
        for (const [hl, altUrl] of alternates) {
          if (hl === 'x-default') continue;
          const alt = await fetchStatusHtml(altUrl, args.timeout);
          reciprocityChecked++;
          if (alt.status !== 200) { errors.push(`alternate ${hl} → ${altUrl} returned ${alt.status}`); continue; }
          const back = parseHreflang(alt.html).alternates.get(langOf(pageUrl));
          const norm = (u) => String(u || '').replace(/\/$/, '');
          if (norm(back) !== norm(pageUrl)) errors.push(`alternate ${hl} does not return-tag back to ${pageUrl} (got ${back})`);
        }
      }
      if (errors.length) problems.push({ url: pageUrl, errors });
    }
  }

  const result = {
    base: args.base, childSitemaps: childSitemaps.length,
    pagesChecked: checked, reciprocityLinksChecked: reciprocityChecked,
    problems,
  };
  if (args.json) { console.log(JSON.stringify(result, null, 2)); }
  else {
    console.log(`Hreflang audit — base ${args.base} · ${childSitemaps.length} child sitemaps · ${checked} pages · ${reciprocityChecked} reciprocity links`);
    if (!problems.length) console.log('RESULT: ✅ every sampled page has a valid, reciprocal hreflang cluster');
    else {
      console.log(`RESULT: ❌ ${problems.length} page(s) with hreflang problems:`);
      for (const p of problems.slice(0, 40)) console.log(`  · ${p.url}\n      ${p.errors.join('\n      ')}`);
    }
  }
  process.exit(problems.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
