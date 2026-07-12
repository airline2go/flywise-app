'use client';

// Shared airline-logo renderer used by the offer card (.al-logo) and the
// flight-detail sheet (.seg-al-logo). Ports app.js's onLogoErr() exactly:
// on a failed Duffel logo load, hide the <img> and turn its parent into a
// solid colored rounded badge showing the IATA code (span.al-badge), using
// the airline's brand color + readable text color.
import { getAirlineColor, getAirlineTextColor } from './airlineColors';

function onLogoErr(img, code, color) {
  img.style.display = 'none';
  const parent = img.parentNode;
  if (!parent) return;
  parent.style.background = color || getAirlineColor(code || 'XX');
  parent.style.borderRadius = '9px';
  parent.style.display = 'flex';
  parent.style.alignItems = 'center';
  parent.style.justifyContent = 'center';
  parent.style.color = getAirlineTextColor(code || 'XX');
  const span = document.createElement('span');
  span.className = 'al-badge';
  span.textContent = code || 'XX';
  parent.appendChild(span);
}

export function AirlineLogo({ code, className = 'al-logo', as: Tag = 'div' }) {
  const safeCode = code || 'XX';
  const color = getAirlineColor(safeCode);
  return (
    <Tag className={className} data-code={safeCode} data-color={color}>
      {/* eslint-disable-next-line @next/next/no-img-element -- external Duffel airline-logo SVG (no remotePatterns configured); matches the original's plain <img loading="lazy"> + onerror fallback. */}
      <img
        src={`https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/${safeCode}.svg`}
        alt={safeCode}
        loading="lazy"
        onError={(e) => onLogoErr(e.currentTarget, safeCode, color)}
      />
    </Tag>
  );
}
