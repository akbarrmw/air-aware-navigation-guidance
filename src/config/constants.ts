/**
 * Konfigurasi layanan eksternal dan kota pilot (PRD Bagian 8 & 12)
 * Pemilik: Person 2 (Backend Services)
 */
export const CONSTANTS = {
  // Kota Pilot: Semarang Kota [minLat, minLng, maxLat, maxLng]
  PILOT_CITY: {
    NAME: 'Semarang',
    BBOX: [-7.08, 110.32, -6.93, 110.50] as [number, number, number, number],
    DEFAULT_CENTER: [-6.9932, 110.4203] as [number, number],
    DEFAULT_ZOOM: 13,
  },
  DEFAULT_GEOCODER_URL: process.env.GEOCODER_BASE_URL || 'https://nominatim.openstreetmap.org',
  DEFAULT_ROUTING_URL: process.env.ROUTING_BASE_URL || 'https://router.project-osrm.org',
  DEFAULT_USER_AGENT: process.env.GEOCODER_USER_AGENT || 'AANG-Hackathon-App/1.0',
};
