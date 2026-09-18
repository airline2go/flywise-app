const PAGE = `<!doctype html>
<html lang="de" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Impressum | Airpiv</title>
  <meta name="description" content="Impressum und Anbieterkennzeichnung von Airpiv.">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://airpiv.com/impressum">
  <style>
    :root{color-scheme:dark;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    *{box-sizing:border-box}
    body{margin:0;background:#101d2c;color:#edf4f8;line-height:1.7}
    main{max-width:860px;margin:0 auto;padding:48px 20px 72px}
    .back{display:inline-block;margin-bottom:28px;color:#79ded0;text-decoration:none;font-weight:700}
    .card{background:#172536;border:1px solid #2b3d50;border-radius:18px;padding:28px;margin:16px 0}
    h1{font-size:clamp(2rem,5vw,3rem);line-height:1.1;margin:0 0 8px}
    h2{font-size:1.2rem;margin:0 0 12px}
    p{margin:0 0 12px}
    a{color:#79ded0}
    small{color:#a9bac8}
    footer{margin-top:28px;color:#91a4b2}
  </style>
</head>
<body>
  <main>
    <a class="back" href="/">← Zur Startseite</a>
    <h1>Impressum</h1>
    <small>Angaben gemäß § 5 DDG</small>

    <section class="card">
      <h2>Betreiber</h2>
      <p><strong>Airpiv</strong><br>
      Inhaber: Ahmed Alhamayda (Einzelunternehmen)<br>
      Potsdamer Straße 118<br>
      10785 Berlin<br>
      Deutschland</p>
      <p><strong>Kontakt:</strong><br>
      E-Mail: <a href="mailto:support@airpiv.com">support@airpiv.com</a></p>
    </section>

    <section class="card">
      <h2>Rechtsform &amp; Gewerbe</h2>
      <p>Einzelunternehmen (im Nebenerwerb).<br>
      Gewerbe angemeldet beim Ordnungsamt Mitte, Berlin (24.07.2026).</p>
    </section>

    <section class="card">
      <h2>Verantwortlich für den Inhalt gemäß § 18 Abs. 2 MStV</h2>
      <p>Ahmed Alhamayda<br>Anschrift wie oben</p>
    </section>

    <section class="card">
      <h2>Haftungsausschluss</h2>
      <p>Airpiv ist eine Flugsuchmaschine und vermittelt Buchungen über die Duffel API. Für die Richtigkeit der Flugdaten sind die jeweiligen Airlines verantwortlich. Preisangaben sind unverbindlich und können sich ändern.</p>
    </section>

    <section class="card">
      <h2>Verbraucherstreitbeilegung</h2>
      <p>Wir sind nicht verpflichtet und grundsätzlich nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
    </section>

    <footer>© 2026 Airpiv</footer>
  </main>
</body>
</html>`;

export function GET() {
  return new Response(PAGE, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}