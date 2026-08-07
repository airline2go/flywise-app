'use strict';

// [GSC-CSV §7] Parses a Google Search Console "Pages" CSV export into raw rows
// the normalizer/classifier already understand — the manual-import path when no
// live GSC API is connected. Runs entirely client-side (browser) or in tests; no
// Node/network dependency, nothing fabricated.
//
// Handles the shapes GSC actually exports:
//   • English headers:  Top pages, Clicks, Impressions, CTR, Position
//   • German headers:   Häufigste Seiten, Klicks, Impressionen, CTR, Position
//   • comma OR semicolon OR tab delimiters (locale-dependent)
//   • English "9.28" and German "9,28" decimals; CTR like "5.19%" / "5,19 %"
//   • quoted fields, a UTF-8 BOM, blank/trailing lines
// The CSV's own CTR column is intentionally IGNORED — CTR is recomputed from
// clicks/impressions downstream so it can never disagree with the counts.

// Header aliases (lower-cased, trimmed) → canonical field.
const COLUMN_ALIASES = {
  url: ['page', 'pages', 'top pages', 'url', 'address', 'landing page', 'seite', 'seiten', 'häufigste seiten', 'top-seiten'],
  query: ['query', 'queries', 'top queries', 'keyword', 'search query', 'suchanfrage', 'suchanfragen', 'häufigste suchanfragen'],
  clicks: ['clicks', 'click', 'klicks'],
  impressions: ['impressions', 'impression', 'impressionen'],
  position: ['position', 'avg. position', 'average position', 'avg position', 'durchschnittliche position', 'durchschnittspos.', 'pos'],
};

// Detect the delimiter from the header line by counting candidates outside quotes.
function detectDelimiter(headerLine) {
  const counts = { ',': 0, ';': 0, '\t': 0 };
  let inQuotes = false;
  for (const ch of headerLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch in counts) counts[ch] += 1;
  }
  let best = ',';
  for (const d of Object.keys(counts)) if (counts[d] > counts[best]) best = d;
  return counts[best] > 0 ? best : ',';
}

// Split one CSV line on `delim`, honoring double-quoted fields ("" = literal ").
function splitLine(line, delim) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i += 1; }
      else inQuotes = !inQuotes;
    } else if (ch === delim && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

// Locale-tolerant number parse. GSC exports carry no thousands separators, so a
// lone comma is always a decimal separator (German). Returns null when empty/NaN.
function parseNum(raw) {
  if (raw == null) return null;
  let s = String(raw).replace(/^"|"$/g, '').replace(/%/g, '').replace(/\s/g, '');
  if (!s) return null;
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    // The separator that appears LAST is the decimal point; drop the other.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (hasComma) {
    s = s.replace(',', '.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function mapHeader(cells) {
  const map = {}; // canonical field → column index
  cells.forEach((cell, i) => {
    const key = cell.toLowerCase().replace(/^"|"$/g, '').trim();
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (map[field] == null && aliases.includes(key)) map[field] = i;
    }
  });
  return map;
}

// Parse the whole CSV text. Returns { rows, meta }. `rows` are raw GSC-shaped
// objects ({ url, query, clicks, impressions, position }) ready for
// buildOpportunityReport(); `meta` reports what was detected + any warnings so
// the UI can guide the user (e.g. "no Page column — export the Pages report").
function parseGscCsv(text) {
  const warnings = [];
  if (typeof text !== 'string' || !text.trim()) {
    return { rows: [], meta: { rowCount: 0, warnings: ['Empty file'], columns: {} } };
  }
  const clean = text.replace(/^﻿/, ''); // strip BOM
  const lines = clean.split(/\r\n|\n|\r/).filter((l) => l.trim() !== '');
  if (lines.length < 2) {
    return { rows: [], meta: { rowCount: 0, warnings: ['No data rows'], columns: {} } };
  }
  const delim = detectDelimiter(lines[0]);
  const header = splitLine(lines[0], delim);
  const cols = mapHeader(header);

  if (cols.url == null) {
    warnings.push('No "Page"/"Seiten" column found — export the PAGES report (not Queries) from Search Console.');
    return { rows: [], meta: { rowCount: 0, warnings, columns: cols, delimiter: delim } };
  }
  if (cols.impressions == null && cols.position == null) {
    warnings.push('No Impressions/Position columns found — the classifier needs both.');
  }

  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitLine(lines[i], delim);
    const url = cols.url != null ? (cells[cols.url] || '').replace(/^"|"$/g, '').trim() : '';
    if (!url) continue;
    rows.push({
      url,
      query: cols.query != null ? (cells[cols.query] || '').replace(/^"|"$/g, '').trim() || null : null,
      clicks: cols.clicks != null ? parseNum(cells[cols.clicks]) : null,
      impressions: cols.impressions != null ? parseNum(cells[cols.impressions]) : null,
      position: cols.position != null ? parseNum(cells[cols.position]) : null,
    });
  }

  return { rows, meta: { rowCount: rows.length, warnings, columns: cols, delimiter: delim } };
}

module.exports = { parseGscCsv, parseNum };
