'use client';

// Ports popular-routes.js — the "Beliebte Flugstrecken" SEO internal-links
// section that sits between the FAQ/live-chat block and the footer. Fetches
// real published route-pages and renders them as crawlable <a href="/flights/
// {slug}"> chips (origin → destination), then reveals the section. Hidden if
// the request fails or returns nothing, exactly like the original.
import { useEffect, useState } from 'react';
import { API_BASE } from '../booking-api';

const chipStyle = {
  background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 20,
  padding: '8px 16px', fontSize: 13, fontWeight: 600, color: 'var(--tx)', textDecoration: 'none',
};

export default function PopularRoutes({ lang }) {
  const [routes, setRoutes] = useState([]);
  const prefix = lang === 'de' ? '' : `/${lang}`;

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/route-pages?limit=24`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive || !j.ok || !j.routes || !j.routes.length) return;
        setRoutes(j.routes.slice(0, 24));
      })
      .catch(() => { /* section stays hidden on failure, matching the original */ });
    return () => { alive = false; };
  }, []);

  if (!routes.length) return null;

  return (
    <section id="popular-routes-links-section" className="sec">
      <h2 className="sec-title">Beliebte Flugstrecken</h2>
      <div id="popular-routes-links" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {routes.map((r) => (
          <a key={r.slug} href={`${prefix}/flights/${encodeURIComponent(r.slug)}`} style={chipStyle}>
            {r.origin_city} → {r.destination_city}
          </a>
        ))}
      </div>
    </section>
  );
}
