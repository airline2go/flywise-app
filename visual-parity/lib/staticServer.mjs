// [STATIC-SERVER] Minimal, dependency-free static file server used to serve
// the legacy frontend (flywise-app repo root) during a capture run. It mirrors
// the one behaviour a production static host gives us that matters for parity:
// a clean URL like /about resolves to /about.html, and / resolves to
// /index.html. No directory listings, no caching headers, no range requests —
// just enough to render a page for a screenshot.

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
};

// Resolve a request path to a file inside docRoot, applying clean-URL rules
// and guarding against path traversal. Returns null if nothing sensible maps.
async function resolveFile(docRoot, urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  if (rel.endsWith('/')) rel += 'index.html';

  const candidates = [rel];
  if (!path.extname(rel)) {
    // Clean URL: /about → /about.html, then /about/index.html.
    candidates.push(`${rel}.html`, path.join(rel, 'index.html'));
  }

  for (const c of candidates) {
    const abs = path.join(docRoot, path.normalize(c));
    if (!abs.startsWith(docRoot)) continue; // traversal guard
    try {
      const st = await fsp.stat(abs);
      if (st.isFile()) return abs;
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

// Start the server; resolves to { url, close() }. `notFoundFile` (e.g.
// 404.html) is served with a 404 status when nothing matches, so the
// harness can screenshot the real not-found page.
export async function startStaticServer({ docRoot, port = 0, notFoundFile = null }) {
  const server = http.createServer(async (req, res) => {
    const abs = await resolveFile(docRoot, req.url || '/');
    const send = (file, status) => {
      const stream = fs.createReadStream(file);
      res.writeHead(status, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
      stream.pipe(res);
      stream.on('error', () => {
        res.writeHead(500);
        res.end('read error');
      });
    };

    if (abs) return send(abs, 200);

    const nf = notFoundFile ? path.join(docRoot, notFoundFile) : null;
    if (nf && fs.existsSync(nf)) return send(nf, 404);

    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });

  const { port: actualPort } = server.address();
  return {
    url: `http://127.0.0.1:${actualPort}`,
    close: () => new Promise((r) => server.close(r)),
  };
}
