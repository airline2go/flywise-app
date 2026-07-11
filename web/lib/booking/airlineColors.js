// Ported verbatim from app.js's AIRLINE_COLORS/AIRLINE_TEXT maps (used
// for the offer card's airline-logo fallback badge when the real Duffel
// logo image 404s) — same colors, same fallback ("#1c2c40"/"#fff").
const AIRLINE_COLORS = {
  LH: '#f9ba00', FR: '#073590', U2: '#ff6600', EW: '#aa0061', W6: '#c6007e',
  VY: '#ffcc00', KL: '#00a1de', AF: '#002157', BA: '#075aaa', IB: '#d7192d',
  TP: '#00805a', AZ: '#0066b3', LX: '#e30613', OS: '#cc0000', SK: '#003d85',
  TK: '#c90119', PC: '#fdb913', EK: '#d71921', QR: '#5c0632', EY: '#bd8b13',
  SQ: '#f99f1c', CX: '#00645a', NH: '#13448f', UA: '#005daa', DL: '#c8102e',
  AA: '#0078d2', AC: '#d22630', WY: '#da291c', G9: '#ff6b00', FZ: '#d71921',
  GF: '#5c0a2e', MS: '#007dc5', RJ: '#00539b',
};
const AIRLINE_TEXT = { VY: '#333', PC: '#003d7c', EK: '#c9a227', QR: '#c9a227', SQ: '#003d85' };

function getAirlineColor(code) {
  return AIRLINE_COLORS[code] || '#1c2c40';
}
function getAirlineTextColor(code) {
  return AIRLINE_TEXT[code] || '#fff';
}

export { getAirlineColor, getAirlineTextColor };
