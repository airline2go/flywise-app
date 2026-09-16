const DUFFEL_LOGO_BASE = "https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/";

export const runtime = "nodejs";

function fallbackSvg(code) {
  const safe = String(code || "??").replace(/[^A-Z0-9]/g, "").slice(0, 3) || "??";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" rx="18" fill="#1c2c40"/><text x="40" y="47" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="800" fill="#fff">${safe}</text></svg>`;
}

export async function GET(request) {
  const code = (new URL(request.url).searchParams.get("code") || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{2,3}$/.test(code)) {
    return new Response(fallbackSvg("??"), {
      status: 400,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  }

  try {
    const response = await fetch(`${DUFFEL_LOGO_BASE}${code}.svg`, {
      headers: { Accept: "image/svg+xml,image/*;q=0.9,*/*;q=0.8" },
      next: { revalidate: 86400 },
    });

    if (response.ok) {
      const svg = await response.text();
      return new Response(svg, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
  } catch (_) {
    // Fall through to the deterministic local fallback.
  }

  return new Response(fallbackSvg(code), {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
