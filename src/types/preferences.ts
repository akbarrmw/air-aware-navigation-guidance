/**
 * Tipe data preferensi optimasi rute pengguna.
 */

/**
 * Pengaturan preferensi optimasi pencarian dan pemeringkatan rute.
 */
export interface RoutePreferences {
  /**
   * Bobot trade-off antara waktu perjalanan dan paparan polusi udara.
   * Rentang nilai: 0.0 (hanya peduli kecepatan) hingga 1.0 (hanya peduli kebersihan udara).
   */
  exposureWeight: number;

  /**
   * Batas maksimal toleransi tambahan waktu perjalanan dibanding rute tercepat.
   * Satuan: PERSEN (0 hingga 100).
   * Bernilai `null` jika pengguna tidak membatasi tambahan waktu (unlimited).
   */
  maxExtraTimePercent: number | null;
}

/**
 * Preset cepat preferensi rute yang dapat dipilih langsung di antarmuka pengguna:
 * - `fastest`: Mengabaikan polusi, fokus 100% pada rute paling cepat (bobot = 0.0)
 * - `balanced`: Keseimbangan kompromi antara durasi dan kebersihan (bobot = 0.5)
 * - `clean`: Mengutamakan udara paling bersih asalkan masuk batas waktu (bobot = 0.8)
 */
export const ROUTE_PRESETS = {
  fastest: 0.0,
  balanced: 0.5,
  clean: 0.8,
} as const;

/**
 * Nilai preferensi default jika pengguna belum melakukan personalisasi.
 */
export const DEFAULT_PREFERENCES: RoutePreferences = {
  exposureWeight: 0.5,
  maxExtraTimePercent: 30,
};

/**
 * Alias kompatibilitas mundur untuk `RoutePreferences`.
 */
export type OptimizationPreference = RoutePreferences;
