'use client';

import { ADMIN_COLORS } from './theme';
import { labelStyle, inputStyle } from './EntityModal';

// [GEO-CMS] Same 7 languages/order as admin.js's GEO_LANGUAGES — shared
// by the cities/countries/airports editors (airlines has no translations
// sub-resource server-side).
const GEO_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ar', name: 'العربية' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' },
  { code: 'nl', name: 'Nederlands' },
];

export default function TranslationsEditor({ values, onChange, label = 'الترجمات (7 لغات)' }) {
  return (
    <div>
      <div style={{ ...labelStyle, marginTop: 12 }}>{label}</div>
      {GEO_LANGUAGES.map((l) => (
        <div key={l.code} style={{ marginBottom: 8 }}>
          <label style={{ ...labelStyle, fontSize: 11, marginTop: 6 }}>
            {l.name} ({l.code})
            <input
              type="text" value={values[l.code] || ''}
              onChange={(e) => onChange({ ...values, [l.code]: e.target.value })}
              style={inputStyle}
            />
          </label>
        </div>
      ))}
    </div>
  );
}

function translationsSummary(count) {
  return `${count || 0}/7`;
}

export { GEO_LANGUAGES, translationsSummary };
