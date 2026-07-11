'use client';

import { useState } from 'react';
import CitiesTab from './CitiesTab';
import CountriesTab from './CountriesTab';
import AirportsTab from './AirportsTab';
import AirlinesTab from './AirlinesTab';
import { ADMIN_COLORS } from '../../../../lib/admin/theme';

const TABS = [
  { key: 'cities', label: 'المدن' },
  { key: 'countries', label: 'الدول' },
  { key: 'airports', label: 'المطارات' },
  { key: 'airlines', label: 'شركات الطيران' },
];

export default function GeoClient() {
  const [tab, setTab] = useState('cities');

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>المطارات والمدن</h1>
        <p style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, marginTop: 4 }}>
          إدارة المدن والدول والمطارات وترجمة أسمائها لكل اللغات السبع — بدون الحاجة لتعديل الكود
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {TABS.map((t) => (
          <button
            key={t.key} type="button" onClick={() => setTab(t.key)}
            style={t.key === tab ? tabBtnActiveStyle : tabBtnStyle}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'cities' && <CitiesTab />}
      {tab === 'countries' && <CountriesTab />}
      {tab === 'airports' && <AirportsTab />}
      {tab === 'airlines' && <AirlinesTab />}
    </div>
  );
}

const tabBtnStyle = {
  padding: '8px 16px', borderRadius: 8, border: `1px solid ${ADMIN_COLORS.border}`, background: 'transparent',
  color: ADMIN_COLORS.tx, fontSize: 13.5, cursor: 'pointer',
};
const tabBtnActiveStyle = {
  ...tabBtnStyle, background: ADMIN_COLORS.teal, borderColor: ADMIN_COLORS.teal, color: ADMIN_COLORS.bg, fontWeight: 700,
};
