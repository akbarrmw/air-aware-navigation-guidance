/**
 * @file aqiConversion.ts
 * @description Modul konversi matematis dua arah antara Indeks Kualitas Udara (AQI) dan konsentrasi massa PM2.5 (µg/m³).
 * Menggunakan tabel breakpoint US-EPA PM2.5 resmi sesuai keputusan K-G3.
 * 
 * @author Person 1 (Core Algorithm & System Integration)
 * @module lib/algorithms/aqiConversion
 * @see CODE_SPEC_AANG.md Bagian 3.8 & Bagian 6 (FR-04, TC-06)
 */

import type { AqiCategoryCode } from '@/types/aqiScale';
import { AQI_CATEGORIES } from '@/types/aqiScale';

/**
 * Versi breakpoint AQI yang digunakan sebagai rujukan standar (Keputusan K-G3).
 */
export const AQI_BREAKPOINT_VERSION = 'US-EPA-2024';

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
 * Melakukan interpolasi linear terbalik terhadap tabel breakpoint resmi.
 * 
 * Rumus EPA:
 * C = ((I - I_low) / (I_high - I_low)) * (C_high - C_low) + C_low
 * 
 * Aturan batas (edge cases):
 * - Input null atau negatif (< 0) -> mengembalikan null
 * - Input di atas batas atas 500 -> di-clamp pada 500 (C_max = 500.4 µg/m³)
 * 
 * @param aqi Nilai indeks AQI (0 s/d 500+)
 * @returns Konsentrasi PM2.5 dalam µg/m³ (dibulatkan 1 desimal), atau null bila tidak valid
 * 
 * @example
 * ```ts
 * aqiToPm25(50);  // 12.0 µg/m³
 * aqiToPm25(100); // 35.4 µg/m³
 * aqiToPm25(null); // null
 * ```
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
 * Menentukan kode kategori kualitas udara resmi berdasarkan konsentrasi PM2.5 (µg/m³).
 * 
 * @param pm25 Konsentrasi partikulat PM2.5 dalam µg/m³
 * @returns Kode kategori resmi AqiCategoryCode atau null bila input null / negatif
 * 
 * @example
 * ```ts
 * pm25ToCategory(12.0); // 'good'
 * pm25ToCategory(35.4); // 'moderate'
 * pm25ToCategory(null); // null
 * ```
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
 * Mendapatkan label Bahasa Indonesia ramah pengguna untuk kategori AQI.
 * 
 * @param pm25 Konsentrasi PM2.5 (µg/m³) atau kode AqiCategoryCode
 * @returns Label Bahasa Indonesia (contoh: 'Baik', 'Sedang', 'Tidak Tersedia')
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
 * Alias kompatibilitas mundur untuk aqiToPm25.
 */
export const aqiToPm25Concentration = aqiToPm25;
