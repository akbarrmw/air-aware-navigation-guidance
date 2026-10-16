/**
 * Tipe data stasiun pemantau kualitas udara.
 */

import type { DataType, BoundingBox } from './common';
import type { ApiWarning } from './api';

/**
 * Status kesegaran data observasi stasiun pemantau:
 * - `fresh`: Data baru dan mutakhir (usia <= PAR-04, default 3 jam)
 * - `stale`: Data lama tetapi masih dapat digunakan (3 jam < usia <= 24 jam)
 * - `expired`: Data kedaluwarsa (> 24 jam) dan wajib diabaikan dari kalkulasi IDW
 */
export type FreshnessStatus = 'fresh' | 'stale' | 'expired';

/**
 * Representasi data satu stasiun pemantau kualitas udara.
 */
export interface StationData {
  /** Identitas unik stasiun (misal: ID stasiun WAQI atau kode sensor) */
  stationId: string;
  /** Nama stasiun atau lokasi penempatan */
  stationName: string;
  /** Latitude stasiun */
  lat: number;
  /** Longitude stasiun */
  lng: number;
  /** Indeks Kualitas Udara terpadu (AQI), atau null jika sensor tidak aktif */
  aqi: number | null;
  /** Polutan utama penentu indeks (misal: 'pm25', 'pm10', 'o3') */
  dominantPollutant: string | null;
  /**
   * Konsentrasi partikulat halus PM2.5 dalam satuan µg/m³.
   * PENTING: bernilai null jika tidak tersedia. JANGAN PERNAH mengisi 0 untuk data yang absen!
   */
  pm25Concentration: number | null;
  /** Asal usul data PM2.5: langsung diukur sensor ('measured') atau diturunkan dari AQI ('derivedFromAqi') */
  pm25Origin: 'measured' | 'derivedFromAqi' | null;
  /** Konsentrasi partikulat PM10 dalam satuan µg/m³ */
  pm10Concentration: number | null;
  /** Waktu observasi data dalam ISO UTC string. Jika null, otomatis diperlakukan sebagai expired */
  observedAt: string | null;
  /** Usia data observasi dalam satuan menit dihitung dari waktu sekarang */
  ageMinutes: number | null;
  /** Klasifikasi kesegaran data */
  freshness: FreshnessStatus;
  /** Jenis sumber data stasiun */
  dataType: DataType;
  /** Nama lembaga atau penyedia sumber data (misal: 'BMKG', 'WAQI', 'KLHK') */
  sourceName: string;
  /** Jarak terdekat stasiun ke koridor rute jika dihitung dalam konteks rute navigasi (meter) */
  distanceMeters?: number;
}

/**
 * Payload respons untuk endpoint daftar stasiun (/api/air-quality/stations).
 */
export interface StationsPayload {
  /** Daftar stasiun yang ditemukan dalam radius / area pencarian */
  stations: StationData[];
  /** Bounding box area pencarian stasiun */
  bbox: BoundingBox;
  /** Waktu pengambilan data dilakukan (ISO UTC string) */
  fetchedAt: string;
  /** Menandakan apakah data disajikan dari memori cache server */
  fromCache: boolean;
  /** Daftar peringatan terkait ketersediaan atau kesegaran data stasiun */
  warnings: ApiWarning[];
}

/**
 * Tipe alias ramah bahasa Indonesia untuk kategori udara (kompatibilitas transisi).
 */
export type AirQualityCategory =
  | 'Baik'
  | 'Sedang'
  | 'Tidak Sehat bagi Sensitif'
  | 'Tidak Sehat'
  | 'Sangat Tidak Sehat'
  | 'Berbahaya';
