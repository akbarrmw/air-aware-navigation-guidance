/**
 * @file confidence.ts
 * @description Modul penentuan tingkat keyakinan (Confidence Level) hasil estimasi paparan rute (M-04).
 * @author Person 1 (Core Algorithm & System Integration)
 * @module lib/algorithms/confidence
 * @see CODE_SPEC_AANG.md Bagian 3.5 & PRD Bagian 9.4 (TC-07)
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
 * Menentukan tingkat keyakinan (Confidence Level) ilmiah estimasi paparan rute.
 * 
 * Aturan tingkatan (Hierarki TC-07):
 * 1. `unavailable`:
 *    - Jika coverageRatio < minCoverageRatio (PAR-08, default 0.20 / 20%).
 * 2. `high`:
 *    - coverageRatio >= 0.80 (80%)
 *    - nearbyStationDurationRatio >= 0.50 (50% rute berada dekat stasiun <= 3km)
 *    - maxDataAgeMinutes <= freshMaxMinutes (PAR-04, default 180 menit / 3 jam)
 *    - hasExpiredData === false
 *    - hasModelFallback === false (model fallback membatasi maksimal Medium)
 * 3. `medium`:
 *    - coverageRatio >= 0.50 (50%)
 *    - hasExpiredData === false
 * 4. `low`:
 *    - coverageRatio >= 0.20 (20%)
 * 
 * @param metrics Metrik evaluasi cakupan dan kesegaran data
 * @param params Parameter algoritma
 * @returns Tingkat keyakinan: 'high' | 'medium' | 'low' | 'unavailable'
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
