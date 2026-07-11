// ═══════════════════════════════════════════════════════════════
// build/content-variants.js
// [CONTENT-VARIATION-2] Deterministic variant selection for route-page
// prose — the same route always picks the same variant on every rebuild
// (stays crawlable/stable, never flip-flops between deploys), while
// different routes diverge in wording instead of every page in a given
// haul-type/distance bucket reading byte-identical except for city
// names. Not randomness — a stable hash of the seed string, so this is
// reproducible and testable, not "random each time".
// ═══════════════════════════════════════════════════════════════

// FNV-1a, a small well-known non-cryptographic string hash — good
// enough distribution for picking among 2-3 buckets, no dependency needed.
function hashString(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0; // unsigned
}

// Returns a stable index in [0, variantCount) for the given seed string.
// Pass a seed that includes everything the variant should be stable
// against (e.g. `${route.slug}:${lang}` for a per-language-stable pick,
// or just `route.slug` if every language should pick the same variant
// index for that route).
function pickVariant(seedString, variantCount) {
  if (!variantCount || variantCount <= 1) return 0;
  return hashString(String(seedString)) % variantCount;
}

module.exports = { pickVariant, hashString };
