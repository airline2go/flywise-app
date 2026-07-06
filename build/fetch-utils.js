// [BUILD-STABILITY] Small, isolated fetch layer — bounded concurrency, a
// per-request timeout, and a short retry for transient failures. Kept
// deliberately simple (no circuit breaker, no incremental rebuild) since
// today's actual data volume (tens to hundreds of pages) doesn't need it;
// isolating everything behind fetchWithRetry() means an upgrade could wrap
// it later without touching the rest of the generator.

async function fetchWithRetry(url, { retries = 3, timeoutMs = 10000 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
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
      if (attempt < retries) await new Promise((r) => setTimeout(r, 300 * attempt));
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
