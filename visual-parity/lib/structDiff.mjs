// [STRUCT-DIFF] Compare two analyzed HTML documents facet-by-facet and score
// each, producing the same report shape the team already uses:
//   Text 100% · Links 100% · Images 100% · Structured Data 100% ·
//   Meta 100% · CSS differences: N · Layout differences: N · Overall X%
// Every difference is named so a <100% page tells you exactly what drifted.

// Multiset symmetric difference of two arrays → { added, removed } where
// `added` is in b-not-a and `removed` is in a-not-b (counting duplicates).
function multisetDiff(a, b) {
  const count = (arr) => arr.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map());
  const ca = count(a);
  const cb = count(b);
  const keys = new Set([...ca.keys(), ...cb.keys()]);
  const added = [];
  const removed = [];
  for (const k of keys) {
    const d = (cb.get(k) || 0) - (ca.get(k) || 0);
    for (let i = 0; i < d; i++) added.push(k);
    for (let i = 0; i < -d; i++) removed.push(k);
  }
  return { added, removed };
}

// Length of the longest common subsequence — used to count layout drift in
// an order-sensitive way (a moved/removed/added element is one difference).
function lcsLen(a, b) {
  const n = a.length;
  const m = b.length;
  const dp = new Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    let prev = 0;
    for (let j = 1; j <= m; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev + 1 : Math.max(dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[m];
}

const setScore = (a, b) => {
  const { added, removed } = multisetDiff(a, b);
  const union = Math.max(1, new Set([...a, ...b]).size);
  const diffs = added.length + removed.length;
  return { score: 1 - diffs / (union + diffs), count: union, diffs, added, removed };
};

function scoreText(a, b) {
  if (a.text === b.text) return { score: 1, count: a.textWords.length, diffs: 0, samples: [] };
  const { added, removed } = multisetDiff(a.textWords, b.textWords);
  const total = Math.max(1, a.textWords.length + b.textWords.length);
  const diffs = added.length + removed.length;
  const samples = [
    ...removed.slice(0, 6).map((w) => `− "${w}"`),
    ...added.slice(0, 6).map((w) => `+ "${w}"`),
  ];
  return { score: 1 - diffs / total, count: Math.max(a.textWords.length, b.textWords.length), diffs, samples };
}

function scoreLinks(a, b) {
  const r = setScore(a.links, b.links);
  const samples = [...r.removed.slice(0, 8).map((x) => `− ${x}`), ...r.added.slice(0, 8).map((x) => `+ ${x}`)];
  return { ...r, samples };
}

function scoreImages(a, b) {
  const key = (i) => `${i.src}||${i.alt}`;
  const r = setScore(a.images.map(key), b.images.map(key));
  const samples = [...r.removed.slice(0, 8).map((x) => `− ${x}`), ...r.added.slice(0, 8).map((x) => `+ ${x}`)];
  return { ...r, samples };
}

function scoreJsonLd(a, b) {
  const r = setScore(a.jsonld, b.jsonld);
  const samples = [
    ...r.removed.slice(0, 4).map((x) => `− ${x.slice(0, 120)}`),
    ...r.added.slice(0, 4).map((x) => `+ ${x.slice(0, 120)}`),
  ];
  return { ...r, samples };
}

function scoreMeta(a, b) {
  const keys = new Set([...Object.keys(a.meta), ...Object.keys(b.meta)]);
  const samples = [];
  let diffs = 0;
  for (const k of keys) {
    const va = a.meta[k];
    const vb = b.meta[k];
    if (va === vb) continue;
    diffs++;
    if (va === undefined) samples.push(`+ ${k} = "${vb}"`);
    else if (vb === undefined) samples.push(`− ${k} = "${va}"`);
    else samples.push(`~ ${k}: "${va}" → "${vb}"`);
  }
  return { score: 1 - diffs / Math.max(1, keys.size), count: keys.size, diffs, samples: samples.slice(0, 12) };
}

function scoreCss(a, b) {
  // Only legacy rules absent from the candidate count as differences — those
  // are the ones that can change how THIS page looks. The candidate carrying
  // extra rules (e.g. a global bundle with other pages' CSS) is harmless and
  // reported for info only.
  const candSet = new Set(b.css.rules);
  const missing = a.css.rules.filter((r) => !candSet.has(r));
  const legacySet = new Set(a.css.rules);
  const extra = b.css.rules.filter((r) => !legacySet.has(r));
  const diffs = missing.length;
  const total = Math.max(1, a.css.rules.length);
  const samples = [
    ...missing.slice(0, 12).map((x) => `− missing rule ${x}`),
    ...(extra.length ? [`(candidate has ${extra.length} extra rule(s) — not counted)`] : []),
  ];
  return { score: 1 - diffs / total, count: total, diffs, samples };
}

function scoreLayout(a, b) {
  const lcs = lcsLen(a.layout, b.layout);
  const diffs = a.layout.length - lcs + (b.layout.length - lcs);
  const total = Math.max(1, a.layout.length, b.layout.length);
  // Name a few of the drifted nodes.
  const { added, removed } = multisetDiff(a.layout, b.layout);
  const samples = [...removed.slice(0, 8).map((x) => `− ${x}`), ...added.slice(0, 8).map((x) => `+ ${x}`)];
  return { score: 1 - diffs / (total + diffs), count: total, diffs, samples };
}

export function structDiff(a, b) {
  const categories = {
    text: scoreText(a, b),
    links: scoreLinks(a, b),
    images: scoreImages(a, b),
    structuredData: scoreJsonLd(a, b),
    meta: scoreMeta(a, b),
    css: scoreCss(a, b),
    layout: scoreLayout(a, b),
  };
  const totalItems = Object.values(categories).reduce((s, c) => s + c.count, 0) || 1;
  const totalDiffs = Object.values(categories).reduce((s, c) => s + c.diffs, 0);
  const overall = 1 - totalDiffs / totalItems;
  return { categories, overall, totalItems, totalDiffs };
}
