import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// [ADMIN-INVOICE] pdf-lib's standard fonts only encode WinAnsi (Latin-1-ish)
// — any character outside that (→, em-dashes, emoji, Arabic, etc.) throws
// and aborts PDF generation entirely. route_label values like "BER -> IST"
// come straight from the server and contain a real arrow character, so this
// is not a hypothetical edge case — it broke every single invoice with a
// route on it. Replace anything non-WinAnsi-safe with a plain-ASCII
// equivalent before it ever reaches drawText, rather than trying to
// remember to sanitize every call site. Ported verbatim from admin.js.
function sanitizeForPdf(str) {
  return String(str || '')
    .replace(/[→➡➜]/g, '->')
    .replace(/[←]/g, '<-')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/[^\x00-\xFF]/g, '?');
}

// Ported from admin.js's buildInvoicePdf() — same A4 layout, same fields,
// same §19 UStG (Kleinunternehmer) vs. 19% regular-VAT branching.
// [BUG-FIX] The original read cfg.name/cfg.address, but the server's
// invoice-config object only ever has companyName/companyAddress (no
// "name"/"address" keys exist on it) — those two lines have always been
// blank on every real generated invoice. Fixed to read the real field
// names rather than reproducing a silent defect on a legal document.
export async function buildInvoicePdf(record, cfg) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  const teal = rgb(0, 0.49, 0.42);
  const dark = rgb(0.1, 0.12, 0.16);
  const gray = rgb(0.4, 0.45, 0.52);
  const lightLine = rgb(0.85, 0.87, 0.9);

  let y = height - 50;
  const marginX = 50;

  function text(str, x, yy, opts = {}) {
    page.drawText(sanitizeForPdf(str), {
      x, y: yy,
      size: opts.size || 10,
      font: opts.bold ? fontBold : font,
      color: opts.color || dark,
    });
  }
  function line(yy) {
    page.drawLine({ start: { x: marginX, y: yy }, end: { x: width - marginX, y: yy }, thickness: 0.75, color: lightLine });
  }

  // Header: brand
  text('AirPiv', marginX, y, { size: 20, bold: true, color: teal });
  y -= 16;
  text(cfg.companyName, marginX, y, { size: 9, color: gray });
  y -= 12;
  const addrLines = (cfg.companyAddress || '').split('\n');
  addrLines.forEach((l) => { text(l, marginX, y, { size: 9, color: gray }); y -= 12; });
  text(`Steuernummer: ${cfg.steuernummer}`, marginX, y, { size: 9, color: gray });

  // Header: invoice meta (right side)
  let ry = height - 50;
  text('Rechnung', width - marginX - 140, ry, { size: 16, bold: true });
  ry -= 20;
  text(`Rechnungsnummer: ${record.invoiceNumber}`, width - marginX - 200, ry, { size: 9 }); ry -= 13;
  const issued = new Date(record.issuedAt);
  const dateStr = `${String(issued.getDate()).padStart(2, '0')}.${String(issued.getMonth() + 1).padStart(2, '0')}.${issued.getFullYear()}`;
  text(`Rechnungsdatum: ${dateStr}`, width - marginX - 200, ry, { size: 9 }); ry -= 13;
  const svcDate = record.fields.serviceDate ? new Date(record.fields.serviceDate) : issued;
  const svcDateStr = `${String(svcDate.getDate()).padStart(2, '0')}.${String(svcDate.getMonth() + 1).padStart(2, '0')}.${svcDate.getFullYear()}`;
  text(`Leistungsdatum: ${svcDateStr}`, width - marginX - 200, ry, { size: 9 });

  y -= 40;
  line(y);
  y -= 24;

  // Customer block
  text('Kunde:', marginX, y, { size: 9, color: gray }); y -= 14;
  text(record.customerName || '—', marginX, y, { size: 11, bold: true }); y -= 14;
  (record.customerAddress || '').split('\n').forEach((l) => {
    if (l.trim()) { text(l, marginX, y, { size: 9.5 }); y -= 13; }
  });

  y -= 18;
  line(y);
  y -= 10;

  // Table header
  text('Beschreibung', marginX, y - 14, { size: 9, bold: true, color: gray });
  text('Betrag', width - marginX - 70, y - 14, { size: 9, bold: true, color: gray });
  y -= 22;
  line(y);
  y -= 20;

  // Service line
  const f = record.fields;
  let desc = `Flugbuchung: ${f.route || '?'}`;
  if (f.airline) desc += ` (${f.airline})`;
  text(desc, marginX, y, { size: 10 });
  text(`€${(record.amount || 0).toFixed(2)}`, width - marginX - 70, y, { size: 10 });
  y -= 16;
  if (f.pnr) {
    text(`Buchungsreferenz (PNR): ${f.pnr}`, marginX, y, { size: 8.5, color: gray });
    y -= 24;
  } else {
    y -= 10;
  }

  line(y);
  y -= 22;

  // Totals
  const isKlein = cfg.taxMode === 'kleinunternehmer';
  const net = record.amount || 0;
  const vat = isKlein ? 0 : net - (net / 1.19);
  const netBase = isKlein ? net : (net - vat);

  text('Nettobetrag:', width - marginX - 200, y, { size: 9.5, color: gray });
  text(`€${netBase.toFixed(2)}`, width - marginX - 70, y, { size: 9.5 });
  y -= 14;
  if (!isKlein) {
    text('USt. (19%):', width - marginX - 200, y, { size: 9.5, color: gray });
    text(`€${vat.toFixed(2)}`, width - marginX - 70, y, { size: 9.5 });
    y -= 14;
  }
  text('Gesamtbetrag:', width - marginX - 200, y, { size: 11, bold: true });
  text(`€${net.toFixed(2)}`, width - marginX - 70, y, { size: 11, bold: true });
  y -= 30;

  line(y);
  y -= 20;

  // Tax note
  text('Hinweis:', marginX, y, { size: 9, bold: true }); y -= 14;
  const taxNote = isKlein
    ? 'Gemäß §19 UStG wird keine Umsatzsteuer berechnet.'
    : 'Es gilt der Regelsteuersatz von 19% gemäß §12 UStG.';
  text(taxNote, marginX, y, { size: 9, color: gray }); y -= 24;

  text('Zahlungsbedingungen: Sofort fällig / Paid online', marginX, y, { size: 9, color: gray });

  // Footer
  page.drawText(`AirPiv — generiert am ${dateStr}`, { x: marginX, y: 30, size: 7.5, font, color: lightLine });

  return doc.save();
}

export async function mergePdfBuffers(buffers) {
  const merged = await PDFDocument.create();
  for (const buf of buffers) {
    const src = await PDFDocument.load(buf);
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  return merged.save();
}

export function downloadPdfBytes(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Mirrors admin.js's pickField()/extractInvoiceFields() — flexible field
// extraction across a booking row's possible column-name variants.
function pickField(b, candidates) {
  for (const c of candidates) {
    const v = b[c];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

export function extractInvoiceFields(b) {
  return {
    customerName: pickField(b, ['customer_email', 'customer_name', 'passenger_name', 'full_name', 'name']),
    customerAddress: pickField(b, ['customer_address', 'billing_address', 'address']),
    pnr: pickField(b, ['booking_reference', 'booking_ref', 'pnr', 'reference']),
    airline: pickField(b, ['airline']),
    route: pickField(b, ['route_label']),
    serviceDate: pickField(b, ['departure_date', 'created_at']),
    amount: Number(b.customer_paid) || 0,
  };
}
