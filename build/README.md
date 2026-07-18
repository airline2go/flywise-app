# ⚠️ DEPRECATED — do NOT edit these to change production route/entity pages

**Production does NOT serve the output of this directory.**

The live site renders city / country / airport / airline / flight-route / blog
pages through the **Next.js app in `web/`**, specifically the verbatim renderer
copies in **`web/lib/legacy-render/`** (called by `web/app/[lang]/…/route.js`
handlers, with translations in **`web/translations/`**).

The generators here (`generate-pages.js` + `render-*.js`) are the **older
standalone SSG** that predates the Next.js migration. They are retained only
for the non-blocking **`build-check` CI job** (a smoke test that exercises the
real renderers against the live backend). Their generated HTML is **not
deployed anywhere**.

## Where to make changes

| You want to change… | Edit here |
| --- | --- |
| A route / city / country / airport / airline page's HTML | `web/lib/legacy-render/render-*.js` |
| A user-facing string | `web/translations/*.json` |
| The shared header/footer/nav | `web/lib/legacy-render/shell.js` |
| How the live page is fetched/assembled | `web/lib/legacy-render/render.js` |

> The two trees **diverged** after the migration — `web/lib/legacy-render/`
> has its own features (e.g. the route-facts section, inline critical CSS).
> Do **not** bulk-copy `build/` over `web/`: it would clobber those. Port
> changes deliberately, feature by feature, and verify by rendering through
> the `web/` modules.

## History

Editing only `build/` while production served `web/` caused a real drift where
route-page work never reached users (see the reconciliation PRs #97–#100). This
notice exists so that never happens again.
