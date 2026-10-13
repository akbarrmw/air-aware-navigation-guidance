/**
 * Konfigurasi parameter numerik EcoPulse (PRD Bagian 9.3)
 * Pemilik: Person 1 (Core Algorithm)
 */
export const ECOPULSE_PARAMS = {
  PAR_01_SEGMENT_LENGTH_M: 500,        // Panjang segmen diskritisasi rute (meter)
  PAR_02_SEARCH_RADIUS_KM: 10,         // Radius pencarian stasiun kualitas udara (km)
  PAR_03_MAX_NEAREST_STATIONS: 3,      // Jumlah stasiun K-terdekat untuk IDW
  PAR_04_FRESH_THRESHOLD_HOURS: 3,     // Batas data fresh (<= 3 jam)
  PAR_05_EXPIRED_THRESHOLD_HOURS: 24,  // Batas data kedaluwarsa (> 24 jam)
  PAR_06_NEARBY_STATION_KM: 3,         // Ambang batas stasiun dekat untuk kepercayaan tinggi (km)
  PAR_07_SIGNIFICANCE_THRESHOLD: 0.05, // Ambang batas signifikansi selisih EI (5%)
  PAR_08_MIN_COVERAGE_RATIO: 0.20,     // Rasio cakupan minimum agar estimasi dihitung
  PAR_09_DEFAULT_EXTRA_TIME_PCT: 30,   // Batas toleransi tambahan waktu default (+30%)
  PAR_10_ROUTE_OVERLAP_THRESHOLD: 0.90,// Ambang batas tumpang tindih duplikat rute (90%)
  PAR_11_IDW_POWER: 2,                 // Pangkat IDW (p = 2)
  PAR_11_ANTI_SINGULARITY_EPS_M: 100,  // Jarak anti-singularitas epsilon (100 meter)
  PAR_12_CACHE_TTL_MINUTES: 10,        // TTL cache data stasiun (menit)
  PAR_13_TIMEOUT_GEOCODE_MS: 5000,     // Timeout geocoding
  PAR_13_TIMEOUT_ROUTING_MS: 8000,     // Timeout routing
  PAR_13_TIMEOUT_AIR_QUALITY_MS: 5000, // Timeout kualitas udara
  PAR_14_LONG_TRIP_MINUTES: 45,        // Durasi perjalanan panjang untuk pemicu RULE-04
  ALGORITHM_VERSION: '1.0.0-hackathon',
} as const;
