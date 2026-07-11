// Color tokens copied verbatim from the old admin.css's :root custom
// properties — kept as plain JS constants for now (inline-style usage
// until a real shared stylesheet/Tailwind theme lands, tracked as part
// of later admin milestones). Font is IBM Plex Sans Arabic, matching
// the original's --sans.
const ADMIN_COLORS = {
  bg: '#0a0e1a',
  bg2: '#111827',
  bg3: '#1a2235',
  card: '#151d2e',
  border: '#1e2d45',
  teal: '#00c9a7',
  teal2: '#00a082',
  tealGlow: 'rgba(0, 201, 167, 0.15)',
  red: '#ff4d6d',
  redBg: 'rgba(255, 77, 109, 0.1)',
  yellow: '#fbbf24',
  yellowBg: 'rgba(251, 191, 36, 0.1)',
  blue: '#60a5fa',
  blueBg: 'rgba(96, 165, 250, 0.1)',
  tx: '#e2e8f0',
  tx2: '#94a3b8',
  tx3: '#475569',
};

const ADMIN_FONT_SANS = '"IBM Plex Sans Arabic", sans-serif';

export { ADMIN_COLORS, ADMIN_FONT_SANS };
