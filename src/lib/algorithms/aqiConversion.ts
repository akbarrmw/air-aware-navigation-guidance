/**
 * Modul konversi antara Indeks Kualitas Udara (AQI) dan konsentrasi massa PM2.5 (µg/m³).
 */

import type { AqiCategoryCode } from '@/types/aqiScale';
import { AQI_CATEGORIES } from '@/types/aqiScale';

/**
 * Versi breakpoint AQI yang digunakan sebagai rujukan standar (Keputusan K-G3).
 */
export const AQI_BREAKPOINT_VERSION = 'US-EPA-PM25-2024';

/**
 * Definisi rentang breakpoint US-EPA untuk PM2.5 (µg/m³) vs AQI Index.
 * 
 * Referensi: US EPA Air Quality Index (AQI) Technical Assistance Document.
 */
export interface AqiBreakpoint {
  readonly cLow: number;
  readonly cHigh: number;
  readonly iLow: number;
  readonly iHigh: number;
  readonly category: AqiCategoryCode;
}

export const EPA_PM25_BREAKPOINTS: readonly AqiBreakpoint[] = [
  { cLow: 0.0,   cHigh: 12.0,  iLow: 0,   iHigh: 50,  category: 'good' },
  { cLow: 12.1,  cHigh: 35.4,  iLow: 51,  iHigh: 100, category: 'moderate' },
  { cLow: 35.5,  cHigh: 55.4,  iLow: 101, iHigh: 150, category: 'unhealthySensitive' },
  { cLow: 55.5,  cHigh: 150.4, iLow: 151, iHigh: 200, category: 'unhealthy' },
  { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300, category: 'veryUnhealthy' },
  { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500, category: 'hazardous' },
] as const;

/**
 * Mengonversi nilai indeks AQI menjadi estimasi konsentrasi massa PM2.5 (µg/m³).
 */
export function aqiToPm25(aqi: number | null): number | null {
  if (aqi === null || typeof aqi !== 'number' || isNaN(aqi) || aqi < 0) {
    return null;
  }

  // Clamp batas atas 500 sesuai standar EPA
  const clampedAqi = Math.min(aqi, 500);

  const bp = EPA_PM25_BREAKPOINTS.find(
    (b) => clampedAqi >= b.iLow && clampedAqi <= b.iHigh
  );

  if (!bp) return null;

  // Linear inverse interpolation
  const concentration =
    ((clampedAqi - bp.iLow) / (bp.iHigh - bp.iLow)) * (bp.cHigh - bp.cLow) + bp.cLow;

  return Number(concentration.toFixed(1));
}

/**
 * Menentukan kode kategori kualitas udara berdasarkan konsentrasi PM2.5 (µg/m³).
 */
export function pm25ToCategory(pm25: number | null): AqiCategoryCode | null {
  if (pm25 === null || typeof pm25 !== 'number' || isNaN(pm25) || pm25 < 0) {
    return null;
  }

  const clamped = Math.min(pm25, 500.4);
  const bp = EPA_PM25_BREAKPOINTS.find(
    (b) => clamped >= b.cLow && clamped <= b.cHigh
  );

  return bp ? bp.category : 'hazardous';
}

/**
 * Mendapatkan label Bahasa Indonesia untuk kategori AQI.
 */
export function pm25ToCategoryLabel(pm25OrCode: number | AqiCategoryCode | null): string {
  if (pm25OrCode === null) return 'Tidak Tersedia';

  const code: AqiCategoryCode | null =
    typeof pm25OrCode === 'string' ? pm25OrCode : pm25ToCategory(pm25OrCode);

  if (!code) return 'Tidak Tersedia';

  const categoryInfo = AQI_CATEGORIES.find((c) => c.code === code);
  return categoryInfo ? categoryInfo.labelId : 'Tidak Tersedia';
}

/**
 * Mengonversi konsentrasi PM2.5 (µg/m³) menjadi nilai indeks AQI.
 */
export function pm25ToAqi(pm25: number | null): number | null {
  if (pm25 === null || typeof pm25 !== 'number' || isNaN(pm25) || pm25 < 0) {
    return null;
  }

  const clamped = Math.min(pm25, 500.4);
  const bp = EPA_PM25_BREAKPOINTS.find(
    (b) => clamped >= b.cLow && clamped <= b.cHigh
  );

  if (!bp) return 500;

  const aqi =
    ((clamped - bp.cLow) / (bp.cHigh - bp.cLow)) * (bp.iHigh - bp.iLow) + bp.iLow;

  return Math.round(aqi);
}

/**
 * Alias untuk aqiToPm25.
 */
export const aqiToPm25Concentration = aqiToPm25;
