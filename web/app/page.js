// [PHASE-0] Placeholder — the real homepage stays on the current static
// site until a later phase (see the migration plan). This root route only
// exists so the Next.js app has something to render while Phase 1 (SEO
// entity pages) is under construction.
export default function Home() {
  return (
    <main style={{ padding: 40, fontFamily: 'system-ui, sans-serif' }}>
      <h1>flywise-web</h1>
      <p>Under construction — see the Next.js migration plan.</p>
    </main>
  );
}
