# Airpiv Frontend

The production frontend for Airpiv is the Next.js application in **`web/`**.

## Production source of truth

- **`web/`** — production Next.js application, built and deployed by Vercel.
- **`web/app/`** — App Router routes.
- **`web/lib/legacy-render/`** — server-side renderers used by the current production routes. The directory name is historical; this code is part of the active production app.
- **`web/public/`** — customer-facing static assets, including the booking/search SPA assets.

The former root-level static frontend and its standalone `build/` SSG have been retired. They are not the production source of truth.

## Local development

```bash
cd web
npm ci
npm run dev
```

Production build:

```bash
cd web
npm ci
npm run build
```

Tests:

```bash
cd web
npm test
```

## Deployment

The repository is connected to Vercel through the `flywise-app` project. Production deployments build the Next.js application from `web/`.

Do not recreate or use the retired root `build/` SSG for production pages. Route/entity rendering changes belong in `web/lib/legacy-render/`; application routing belongs under `web/app/`; browser-facing static assets belong under `web/public/`.
