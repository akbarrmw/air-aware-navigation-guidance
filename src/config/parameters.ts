/**
 * @file parameters.ts
 * @description Parameter numerik resmi dan konfigurasi default algoritma AANG (PRD Bagian 9.3, PAR-01 s/d PAR-14).
 * @author Person 1 (Core Algorithm & System Integration)
 * @module config/parameters
 * @see CODE_SPEC_AANG.md Bagian 3.5 & PRD Bagian 9.3
 */

import type { AlgorithmParams } from '@/types/algorithms';

/**
 * Nilai parameter algoritma default (Single Source of Truth untuk Algoritma AANG).
 */
export const DEFAULT_ALGORITHM_PARAMS: AlgorithmParams = {
  /** PAR-01: Panjang segmen diskritisasi rute (500 meter) */
  segmentLengthMeters: 500,

  /** PAR-02: Radius maksimal pencarian stasiun terdekat (10.000 meter / 10 km) */
  stationRadiusMeters: 10000,

  /** PAR-03: Jumlah maksimal stasiun K-terdekat untuk IDW (3 stasiun) */
  nearestStationCount: 3,

  /** PAR-04: Batas data stasiun fresh (180 menit / <= 3 jam) */
  freshMaxMinutes: 180,

  /** PAR-05: Batas data stasiun expired dan diabaikan (1440 menit / > 24 jam) */
  expiredAfterMinutes: 1440,

  /** PAR-06: Jarak stasiun dekat untuk kepercayaan tinggi (3000 meter / 3 km) */
  nearDistanceMeters: 3000,

  /** PAR-07: Ambang batas signifikansi selisih EI (5% / 0.05) */
  significanceThresholdPercent: 5,

  /** PAR-08: Rasio cakupan minimum segmen berdata agar estimasi dihitung (20% / 0.20) */
  minCoverageRatio: 0.20,

  /** PAR-10: Ambang batas tumpang tindih duplikat rute (90% / 0.90) */
  duplicateOverlapPercent: 90,

  /** PAR-11: Pangkat pembobotan jarak IDW (p = 2) */
  idwPower: 2,

  /** PAR-11: Jarak anti-singularitas epsilon IDW (100 meter) */
  idwEpsilonMeters: 100,

  /** PAR-14: Durasi perjalanan panjang untuk pemicu istirahat (45 menit) */
  longTripMinutes: 45,
};

/**
 * Parameter numerik lengkap sistem AANG dalam format konstan.
 */
export const AANG_PARAMS = {
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
  ALGORITHM_VERSION: '1.0.0-aang',
} as const;

/**
 * Alias kompatibilitas mundur dan alternatif penamaan.
 */
export const ECOPULSE_PARAMS = AANG_PARAMS;
export const ALGORITHM_PARAMS = AANG_PARAMS;
