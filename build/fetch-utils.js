// [BUILD-STABILITY] Small, isolated fetch layer — bounded concurrency, a
// per-request timeout, a short retry for transient failures, and pacing to
// avoid bursting the API's rate limiter. Kept deliberately simple (no
// circuit breaker, no incremental rebuild) since today's actual data volume
// (thousands of pages) doesn't need it; isolating everything behind
// fetchWithRetry() means an upgrade could wrap it later without touching
// the rest of the generator.
//
// [RATE-LIMIT-429-FIX] A real deploy hit content.routes.js's shared rate
// limit (Render's build IP making ~1400+ requests for a full build) and
// silently skipped 139+ pages. Two changes address this together: pacing
// (a small delay before every request, so CONCURRENCY workers don't fire
// in synchronized bursts) reduces how much the build's own request rate
// contributes to tripping the limit in the first place; a dedicated 429
// backoff (wait 5s and retry, rather than the generic short backoff used
// for other transient failures) gives the rate-limit window time to reset
// before retrying, instead of hammering it again almost immediately.

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// Jittered 200-500ms — spreads concurrent workers' request timing instead
// of a fixed delay, which would otherwise keep them roughly in lockstep.
function pacingDelay() { return sleep(200 + Math.random() * 300); }

async function fetchWithRetry(url, { retries = 3, timeoutMs = 10000 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    await pacingDelay();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status} for ${url}`);
        err.status = res.status;
        throw err;
      }
      return await res.json();
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (attempt < retries) {
        await sleep(e.status === 429 ? 5000 : 300 * attempt);
      }
    }
  }
  throw lastErr;
}

// Runs `fn` over `items` with at most `limit` in flight at once.
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

module.exports = { fetchWithRetry, mapWithConcurrency };
