'use client';

// Ports the lower half of index.html's homepage verbatim — the sections
// that sit below the search hero: "Beliebte Ziele" destination carousel
// (.sec/.dgrid/.dcard), "Top Strecken" (.rgrid2 from TOP_ROUTES),
// Airline-Partner strip (.pts), the FAQ accordion (.faq-main) and the
// Live-Chat support banner (.support-chat-banner). Same markup/classes/copy
// as the original so the page is pixel-identical, not a reinterpretation.
//
// Destination cards + Top-Strecken chips ran qsHome()/qs() in the SPA
// (fill the search form from BER → code and run the search). Here they
// navigate to the results route for BER → code (date defaults to +21 on the
// results page, matching handleUrlAutoSearch()). Card prices are the same
// hardcoded fallbacks index.html paints on first render; the optional live
// dyn-price refresh is not wired (initial paint is identical either way).
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// HOME_ORIGIN defaults to Berlin (BER) in the original (detectHomeAirport()
// only upgrades it via geolocation); the default render is always "Berlin →".
const HOME_CITY = 'Berlin';
const HOME_CODE = 'BER';

// The 12 "Beliebte Ziele" cards, transcribed from index.html.
const DEST_CARDS = [
  { code: 'LIS', city: 'Lissabon', co: 'Portugal', price: '€89', emoji: '🏖️', tag: { txt: '🔥 Trendig', cls: 'dt-h', bg: 'rgba(220,60,30,.85)' } },
  { code: 'BCN', city: 'Barcelona', co: 'Spanien', price: '€67', emoji: '🏛️', tag: { txt: '✓ Günstig', cls: 'dt-c', bg: 'rgba(0,140,100,.85)' } },
  { code: 'DXB', city: 'Dubai', co: 'VAE', price: '€299', emoji: '🌆', tag: { txt: '⭐ Top', cls: 'dt-n', bg: 'rgba(180,130,0,.85)' } },
  { code: 'JFK', city: 'New York', co: 'USA', price: '€389', emoji: '🗽' },
  { code: 'FCO', city: 'Rom', co: 'Italien', price: '€72', emoji: '🏛️' },
  { code: 'IST', city: 'Istanbul', co: 'Türkei', price: '€58', emoji: '🕌' },
  { code: 'CAI', city: 'Kairo', co: 'Ägypten', price: '€199', emoji: '🐫' },
  { code: 'AMS', city: 'Amsterdam', co: 'Niederlande', price: '€48', emoji: '🚲' },
  { code: 'PRG', city: 'Prag', co: 'Tschechien', price: '€54', emoji: '🏰' },
  { code: 'ATH', city: 'Athen', co: 'Griechenland', price: '€79', emoji: '🏺' },
  { code: 'CPT', city: 'Kapstadt', co: 'Südafrika', price: '€520', emoji: '🏔️' },
  { code: 'BKK', city: 'Bangkok', co: 'Thailand', price: '€459', emoji: '🛕' },
];

// TOP_ROUTES — 30 routes [code, city, flightsPerDay], transcribed verbatim.
const TOP_ROUTES = [
  ['LHR', 'London', 14], ['PMI', 'Mallorca', 8], ['AMS', 'Amsterdam', 10], ['FCO', 'Rom', 6],
  ['VIE', 'Wien', 5], ['MAD', 'Madrid', 7], ['BCN', 'Barcelona', 9], ['LIS', 'Lissabon', 4],
  ['IST', 'Istanbul', 6], ['CDG', 'Paris', 11], ['ATH', 'Athen', 3], ['PRG', 'Prag', 5],
  ['BUD', 'Budapest', 4], ['WAW', 'Warschau', 4], ['CPH', 'Kopenhagen', 5], ['OSL', 'Oslo', 3],
  ['ARN', 'Stockholm', 3], ['HEL', 'Helsinki', 2], ['DUB', 'Dublin', 4], ['ZRH', 'Zürich', 6],
  ['MXP', 'Mailand', 5], ['NCE', 'Nizza', 3], ['LYS', 'Lyon', 2], ['BRU', 'Brüssel', 5],
  ['LUX', 'Luxemburg', 2], ['SVQ', 'Sevilla', 2], ['VLC', 'Valencia', 3], ['NAP', 'Neapel', 3],
  ['SPU', 'Split', 2], ['DBV', 'Dubrovnik', 2],
];

// The 6 FAQ items, transcribed verbatim.
const FAQ_ITEMS = [
  ['Wie kann ich meine Buchung stornieren?', 'Du kannst deine Buchung über unseren Kundenservice stornieren oder direkt gemäß den Tarifbestimmungen deiner Fluggesellschaft. Flexible Tarife ermöglichen eine kostenlose Stornierung bis zu 24 Stunden vor Abflug. Kontaktiere uns unter support@airpiv.com für schnelle Hilfe.'],
  ['Welche Zahlungsmethoden werden unterstützt?', 'Airpiv unterstützt alle gängigen Zahlungsmethoden: Visa, Mastercard, American Express, PayPal sowie Sofortüberweisung. Alle Transaktionen sind SSL-verschlüsselt und DSGVO-konform gesichert.'],
  ['Gibt es versteckte Gebühren bei Airpiv?', 'Nein — bei Airpiv gibt es keine versteckten Gebühren. Alle angezeigten Preise enthalten bereits sämtliche Steuern und obligatorischen Gebühren. Was du siehst, ist der Endpreis.'],
  ['Wie finde ich die günstigsten Flüge?', 'Airpiv vergleicht in Echtzeit hunderte Airlines gleichzeitig. Für die günstigsten Preise empfehlen wir: frühzeitig buchen (6–8 Wochen vor Abflug), flexible Reisedaten nutzen und den Preisalarm aktivieren.'],
  ['Ist meine Buchung sofort bestätigt?', 'Ja! Nach erfolgreicher Buchung erhältst du sofort eine Bestätigungs-E-Mail mit deiner Buchungsreferenz. Die Buchung wird direkt bei der Airline bestätigt — keine Wartezeit.'],
  ['Kann ich für mehrere Personen gleichzeitig buchen?', 'Ja, du kannst Flüge für bis zu 9 Personen gleichzeitig buchen — Erwachsene, Kinder und Kleinkinder. Wähle einfach die Anzahl der Reisenden im Suchformular aus.'],
];

const DTHUMB_BG = 'linear-gradient(135deg,#0A1822,#16283a)';

export default function HomeSections({ lang }) {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState(null);

  const prefix = lang === 'de' ? '' : `/${lang}`;
  function goSearch(code) {
    router.push(`${prefix}/search/${HOME_CODE}-${code}?trip=ow`);
  }

  return (
    <>
      <div className="sec">
        <div className="sec-top">
          <h2 className="sec-title">Beliebte Ziele <em>✨</em></h2>
          <button type="button" className="sec-link">Alle →</button>
        </div>
        <div className="dgrid hscroll">
          {DEST_CARDS.map((d) => (
            <div key={d.code} className="dcard" onClick={() => goSearch(d.code)}>
              <div className="dthumb" style={{ background: DTHUMB_BG }}>
                {d.tag && <div className={`dtag ${d.tag.cls}`} style={{ background: d.tag.bg }}>{d.tag.txt}</div>}
                <div className="dthumb-emoji">{d.emoji}</div>
              </div>
              <div className="dbody">
                <div className="dcity">{d.city}</div>
                <div className="dco">{d.co} · {d.code}</div>
                <div className="dbot"><span className="dfr">ab</span><span className="damt">{d.price}</span></div>
              </div>
            </div>
          ))}
        </div>

        <div className="sec-top"><h2 className="sec-title">Top Strecken <em>→</em></h2></div>
        <div className="rgrid2 hscroll" id="top-strecken-grid">
          {TOP_ROUTES.map(([code, city, freq]) => (
            <div key={code} className="rchip" onClick={() => goSearch(code)}>
              <div>
                <div className="rname">{HOME_CITY} → {city}</div>
                <div className="rfreq">{freq} Flüge/Tag</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pts">
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <h4>Airline-Partner</h4>
          <div className="ptl">
            <div className="pl">Hunderte Airlines weltweit</div>
            <div className="pl">Echtzeitpreise</div>
            <div className="pl">Live-Verfügbarkeit</div>
          </div>
        </div>
      </div>

      <section className="faq-main" aria-label="Häufig gestellte Fragen">
        <div className="faq-wrap">
          <div className="faq-head">
            <h2 className="faq-title">Häufig gestellte Fragen</h2>
            <p className="faq-sub">Alles was du über Airpiv wissen musst</p>
          </div>
          <div className="faq-list">
            {FAQ_ITEMS.map(([q, a], i) => (
              <div key={i} className="faq-item">
                <button type="button" className="faq-q" aria-expanded={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{q}</span>
                  <span className="faq-ico">{openFaq === i ? '−' : '+'}</span>
                </button>
                <div className="faq-a" hidden={openFaq !== i}>
                  <p>{a}</p>
                </div>
              </div>
            ))}

            <div className="support-chat-banner" id="support-chat-banner">
              <div className="scb-glow" />
              <div className="scb-content">
                <div className="scb-left">
                  <div className="scb-avatars">
                    <div className="scb-avatar">👩‍💼</div>
                    <div className="scb-avatar">👨‍💼</div>
                    <div className="scb-avatar scb-avatar-dot">👩</div>
                  </div>
                  <div className="scb-text">
                    <div className="scb-title">Noch Fragen? Wir sind für dich da! 💬</div>
                    <div className="scb-sub"><span className="scb-online-dot" /> Support-Team ist gerade online</div>
                  </div>
                </div>
                <button type="button" className="scb-btn brevo-chat-trigger">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                  Live-Chat starten
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
