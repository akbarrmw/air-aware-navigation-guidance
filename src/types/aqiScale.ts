/**
 * @file aqiScale.ts
 * @description Definisi kategori kualitas udara, kode standar, label bahasa Indonesia, dan palet warna representasi visual.
 * @author Person 1 (Core Algorithm & System Integration)
 * @module types/aqiScale
 * @see CODE_SPEC_AANG.md Bagian 3.3
 */

/**
 * Kode identifikasi standar kategori Indeks Kualitas Udara (AQI / Air Quality Index).
 * Mengikuti skala 6 level US-EPA / standar internasional:
 * - `good`: Baik (0 - 50)
 * - `moderate`: Sedang (51 - 100)
 * - `unhealthySensitive`: Tidak Sehat bagi Kelompok Sensitif (101 - 150)
 * - `unhealthy`: Tidak Sehat (151 - 200)
 * - `veryUnhealthy`: Sangat Tidak Sehat (201 - 300)
 * - `hazardous`: Berbahaya (301+)
 */
export type AqiCategoryCode =
  | 'good'
  | 'moderate'
  | 'unhealthySensitive'
  | 'unhealthy'
  | 'veryUnhealthy'
  | 'hazardous';

/**
 * Informasi metadata lengkap untuk setiap kategori kualitas udara.
 */
export interface AqiCategoryInfo {
  /** Kode kategori unik */
  code: AqiCategoryCode;
  /** Label ramah pengguna dalam Bahasa Indonesia */
  labelId: string;
  /** Kode warna heksadesimal representasi resmi */
  color: string;
  /** Urutan keparahan kualitas udara (0 = paling bersih, 5 = paling berbahaya) */
  order: number;
}

/**
 * Daftar konstan kategori AQI terurut dari tingkat terbaik hingga terburuk.
 */
export const AQI_CATEGORIES: readonly AqiCategoryInfo[] = [
  { code: 'good',               labelId: 'Baik',                       color: '#10B981', order: 0 },
  { code: 'moderate',           labelId: 'Sedang',                     color: '#F59E0B', order: 1 },
  { code: 'unhealthySensitive', labelId: 'Tidak Sehat bagi Sensitif',  color: '#F97316', order: 2 },
  { code: 'unhealthy',          labelId: 'Tidak Sehat',                color: '#EF4444', order: 3 },
  { code: 'veryUnhealthy',      labelId: 'Sangat Tidak Sehat',         color: '#8B5CF6', order: 4 },
  { code: 'hazardous',          labelId: 'Berbahaya',                  color: '#7F1D1D', order: 5 },
] as const;

/**
 * Warna abu-abu netral untuk segmen rute atau stasiun yang datanya tidak tersedia.
 */
export const AQI_UNAVAILABLE_COLOR = '#9CA3AF';
