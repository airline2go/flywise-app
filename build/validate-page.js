// [STRICT-VALIDATION] Every generated page must carry real SEO content
// before it's written — a page failing this check is skipped entirely
// (never published with missing/empty SEO elements), matching the "no
// silent partial content" build policy.
function validatePage(html) {
  const problems = [];
  const titleMatch = html.match(/<title>([^<]*)<\/title>/);
  if (!titleMatch || !titleMatch[1].trim()) problems.push('missing or empty <title>');

  const descMatch = html.match(/<meta name="description" content="([^"]*)"/);
  if (!descMatch || !descMatch[1].trim()) problems.push('missing or empty meta description');

  const canonicalMatch = html.match(/<link rel="canonical" href="([^"]*)"/);
  if (!canonicalMatch || !canonicalMatch[1].trim()) problems.push('missing or empty canonical link');

  const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (!ldBlocks.length) {
    problems.push('missing JSON-LD block');
  } else {
    for (const m of ldBlocks) {
      try {
        const parsed = JSON.parse(m[1]);
        if (!parsed || typeof parsed !== 'object' || !Object.keys(parsed).length) {
          problems.push('empty JSON-LD block');
          break;
        }
      } catch (e) {
        problems.push(`invalid JSON-LD: ${e.message}`);
        break;
      }
    }
  }

  return { ok: problems.length === 0, problems };
}

module.exports = { validatePage };
