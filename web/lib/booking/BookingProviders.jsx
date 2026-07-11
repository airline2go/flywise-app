'use client';

// Single mount point for the 3 booking-app Context providers, composed
// in the order later ones may depend on earlier ones (LoyaltyProvider
// reads useAuth()). Mounted once in RootLayoutChrome so every page —
// SEO entity pages included, since the shared nav's future auth/loyalty
// widget needs it everywhere — has access, matching how app.js's
// FW_USER/loyaltyData were genuinely site-wide globals, not scoped to
// just the search/booking pages.
import { AuthProvider } from './AuthProvider';
import { LoyaltyProvider } from './LoyaltyProvider';
import { SearchProvider } from './SearchProvider';

function BookingProviders({ children }) {
  return (
    <AuthProvider>
      <LoyaltyProvider>
        <SearchProvider>
          {children}
        </SearchProvider>
      </LoyaltyProvider>
    </AuthProvider>
  );
}

export { BookingProviders };
