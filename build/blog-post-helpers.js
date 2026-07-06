const { parse } = require('node-html-parser');

function computeReadingTime(html) {
  const text = html.replace(/<[^>]+>/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function slugifyHeading(text) {
  const base = text.trim().toLowerCase()
    .replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[c]))
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-') || 'abschnitt';
  return base;
}

// [TOC] Mutates `root` in place (assigns id attributes to h2/h3 headings),
// returns the ordered list of {level, text, id} — ported from
// buildTocAndIds() in blog-post.html/-en.html, which did the same thing via
// the browser DOM after the fact.
function buildTocAndIds(root) {
  const headings = root.querySelectorAll('h2, h3');
  const items = [];
  const seen = {};
  headings.forEach((h) => {
    const base = slugifyHeading(h.text);
    let id = base;
    let n = 2;
    while (seen[id]) { id = `${base}-${n++}`; }
    seen[id] = true;
    h.setAttribute('id', id);
    items.push({ level: h.tagName.toLowerCase(), text: h.text.trim(), id });
  });
  return items;
}

const FAQ_HEADING_RE = /^(FAQ|FAQs|Häufig gestellte Fragen|Oft gestellte Fragen|Fragen und Antworten|Wichtige Fragen|Frequently Asked Questions|Questions and Answers)$/i;

// [FAQ-EXTRACTION] Finds an <h2>FAQ</h2>-style heading, consumes the
// following <h3>/<p> question/answer pairs up to the next <h2>, removes them
// from `root` (so they don't appear twice in the rendered body), and returns
// the extracted {question, answer} items — ported from extractFaq() in
// blog-post.html/-en.html.
function extractFaq(root) {
  const h2s = root.querySelectorAll('h2');
  const faqHeading = h2s.find((h) => FAQ_HEADING_RE.test(h.text.trim().replace(/^[^\wäöüÄÖÜ]+/, '')));
  if (!faqHeading) return { items: [] };

  const items = [];
  const toRemove = [faqHeading];
  let node = faqHeading.nextElementSibling;
  let curQ = null;
  let curA = [];
  function flush() { if (curQ && curA.length) items.push({ question: curQ, answer: curA.join(' ') }); curQ = null; curA = []; }
  while (node && node.tagName !== 'H2') {
    toRemove.push(node);
    if (node.tagName === 'H3') { flush(); curQ = node.text.trim(); }
    else if (node.tagName === 'P' && curQ) { curA.push(node.text.trim()); }
    node = node.nextElementSibling;
  }
  flush();
  toRemove.forEach((n) => n.remove());
  return { items };
}

module.exports = { computeReadingTime, buildTocAndIds, extractFaq };
