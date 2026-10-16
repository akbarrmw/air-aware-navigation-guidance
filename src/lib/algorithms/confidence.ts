/**
 * Modul penentuan tingkat keyakinan (Confidence Level) hasil estimasi paparan rute.
 */

import type { ConfidenceLevel } from '@/types/algorithms';
import type { AlgorithmParams } from '@/types/algorithms';
import { DEFAULT_ALGORITHM_PARAMS } from '@/config/parameters';

/**
 * Parameter metrik yang mendasari penentuan Confidence Level.
 */
export interface ConfidenceEvaluationMetrics {
  /** Rasio cakupan segmen rute yang memiliki data valid (0.0 s/d 1.0) */
  coverageRatio: number;
  /** Proporsi durasi perjalanan yang memiliki stasiun dekat <= PAR-06 (3 km) (0.0 s/d 1.0) */
  nearbyStationDurationRatio: number;
  /** Usia data observasi stasiun tertua dalam menit */
  maxDataAgeMinutes: number | null;
  /** Menandakan apakah ada stasiun observasi yang berstatus expired (> 24 jam) */
  hasExpiredData: boolean;
  /** Menandakan apakah data mengandalkan model fallback sintetis */
  hasModelFallback?: boolean;
}

/**
 * Menentukan tingkat keyakinan (Confidence Level) estimasi paparan rute.
 */
export function determineConfidenceLevel(
  metrics: ConfidenceEvaluationMetrics,
  params: AlgorithmParams = DEFAULT_ALGORITHM_PARAMS
): ConfidenceLevel {
  const {
    coverageRatio,
    nearbyStationDurationRatio,
    maxDataAgeMinutes,
    hasExpiredData,
    hasModelFallback = false,
  } = metrics;

  // 1. Jika cakupan di bawah batas minimum (PAR-08: 20%), otomatis tidak valid
  if (coverageRatio < params.minCoverageRatio) {
    return 'unavailable';
  }

  // 2. Evaluasi syarat 'high'
  const isAllFresh =
    maxDataAgeMinutes !== null && maxDataAgeMinutes <= params.freshMaxMinutes;
  const isHighCoverage = coverageRatio >= 0.8;
  const isHighProximity = nearbyStationDurationRatio >= 0.5;

  if (
    isHighCoverage &&
    isHighProximity &&
    isAllFresh &&
    !hasExpiredData &&
    !hasModelFallback
  ) {
    return 'high';
  }

  // 3. Evaluasi syarat 'medium'
  const isMediumCoverage = coverageRatio >= 0.5;
  if (isMediumCoverage && !hasExpiredData) {
    return 'medium';
  }

  // 4. Default memenuhi syarat minimal
  return 'low';
}
