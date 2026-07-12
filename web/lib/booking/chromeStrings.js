// Homepage chrome labels (top-nav links, bottom-nav labels, the register
// button), extracted verbatim from app.js's TRANSLATIONS for all 7 langs.
// These are the homepage-only nav/footer strings — separate from the shared
// entity-page chrome (which the SSG entity pages render with the simpler
// nav). Values are byte-identical to the source; do not paraphrase.
export const CHROME_STRINGS = {
  de: { nav_flights: '✈ Flüge', nav_hotels: '🏨 Hotels', nav_cars: '🚗 Mietwagen', nav_deals: '🏷 Deals', nav_help: '❓ Hilfe', nav_register: 'Registrieren', bnav_flights: '✈ Flüge', bnav_about: 'Über uns', bnav_bookings: 'Buchungen', bnav_help: 'Hilfe', bnav_contact: 'Kontakt' },
  en: { nav_flights: '✈ Flights', nav_hotels: '🏨 Hotels', nav_cars: '🚗 Car rental', nav_deals: '🏷 Deals', nav_help: '❓ Help', nav_register: 'Sign up', bnav_flights: '✈ Flights', bnav_about: 'About us', bnav_bookings: 'Bookings', bnav_help: 'Help', bnav_contact: 'Contact' },
  ar: { nav_flights: '✈ الطيران', nav_hotels: '🏨 الفنادق', nav_cars: '🚗 تأجير سيارات', nav_deals: '🏷 العروض', nav_help: '❓ مساعدة', nav_register: 'إنشاء حساب', bnav_flights: '✈ رحلات', bnav_about: 'من نحن', bnav_bookings: 'حجوزاتي', bnav_help: 'مساعدة', bnav_contact: 'تواصل' },
  es: { nav_flights: '✈ Vuelos', nav_hotels: '🏨 Hoteles', nav_cars: '🚗 Alquiler de coches', nav_deals: '🏷 Ofertas', nav_help: '❓ Ayuda', nav_register: 'Registrarse', bnav_flights: '✈ Vuelos', bnav_about: 'Sobre nosotros', bnav_bookings: 'Reservas', bnav_help: 'Ayuda', bnav_contact: 'Contacto' },
  fr: { nav_flights: '✈ Vols', nav_hotels: '🏨 Hôtels', nav_cars: '🚗 Location de voitures', nav_deals: '🏷 Offres', nav_help: '❓ Aide', nav_register: "S'inscrire", bnav_flights: '✈ Vols', bnav_about: 'À propos', bnav_bookings: 'Réservations', bnav_help: 'Aide', bnav_contact: 'Contact' },
  it: { nav_flights: '✈ Voli', nav_hotels: '🏨 Hotel', nav_cars: '🚗 Noleggio auto', nav_deals: '🏷 Offerte', nav_help: '❓ Aiuto', nav_register: 'Registrati', bnav_flights: '✈ Voli', bnav_about: 'Chi siamo', bnav_bookings: 'Prenotazioni', bnav_help: 'Aiuto', bnav_contact: 'Contatti' },
  nl: { nav_flights: '✈ Vluchten', nav_hotels: '🏨 Hotels', nav_cars: '🚗 Autoverhuur', nav_deals: '🏷 Aanbiedingen', nav_help: '❓ Hulp', nav_register: 'Registreren', bnav_flights: '✈ Vluchten', bnav_about: 'Over ons', bnav_bookings: 'Boekingen', bnav_help: 'Hulp', bnav_contact: 'Contact' },
};
