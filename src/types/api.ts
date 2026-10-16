/**
 * Kontrak standar amplop respons API dan kode galat di seluruh endpoint AANG.
 */

import type { DataMode } from './common';

/**
 * Daftar kode galat standar HTTP/API yang dikembalikan dalam amplop error.
 */
export type ErrorCode =
  | 'VALIDATION_ERROR'    // 400: Validasi input Zod gagal
  | 'UNAUTHENTICATED'     // 401: Belum login atau session kedaluwarsa
  | 'CONSENT_REQUIRED'    // 403: Pengguna belum memberikan persetujuan simpan riwayat
  | 'FORBIDDEN'           // 403: Akses ditolak (misal: mengakses trip pengguna lain)
  | 'NOT_FOUND'           // 404: Entitas atau rute tidak ditemukan
  | 'NO_ROUTE_FOUND'      // 404: Mesin routing gagal menemukan jalur fisik
  | 'UPSTREAM_ERROR'      // 502: Layanan eksternal (OSRM/WAQI) mengembalikan galat
  | 'UPSTREAM_TIMEOUT'    // 504: Layanan eksternal melewati batas timeout yang ditentukan
  | 'RATE_LIMITED'        // 429: Batas kuota permintaan terlampaui
  | 'INTERNAL_ERROR';     // 500: Galat server internal yang tidak tertangani

/**
 * Daftar kode peringatan (non-fatal warning) yang menyertai data respons.
 */
export type WarningCode =
  | 'OUTSIDE_COVERAGE'     // Titik rute berada di luar cakupan stasiun kualitas udara
  | 'SINGLE_ROUTE_ONLY'    // OSRM hanya menyediakan 1 rute alternatif
  | 'AIR_DATA_CACHED'      // Data kualitas udara disajikan dari cache lokal
  | 'AIR_DATA_UNAVAILABLE' // Data polusi tidak tersedia di seluruh jalur
  | 'STATION_DATA_STALE'   // Data observasi stasiun berumur > 3 jam
  | 'LOW_CONFIDENCE'       // Tingkat keyakinan estimasi rendah
  | 'MODEL_DATA_USED'      // Menggunakan fallback model alih-alih stasiun fisik
  | 'SIMULATION_DATA'      // Menggunakan data mock/simulasi
  | 'NO_TRAFFIC_DATA';     // Tidak ada data kemacetan real-time

/**
 * Struktur objek peringatan API yang informatif untuk antarmuka pengguna.
 */
export interface ApiWarning {
  /** Kode klasifikasi peringatan */
  code: WarningCode;
  /** Deskripsi penjelasan ramah pengguna */
  message: string;
}

/**
 * Struktur rincian galat pada amplop respons.
 */
export interface ApiError {
  /** Kode galat standar */
  code: ErrorCode;
  /** Pesan penjelasan penyebab galat */
  message: string;
  /** Data tambahan untuk debugging atau validasi lapangan (misal: field Zod yang gagal) */
  details?: unknown;
}

/**
 * Metadata pelengkap respons API.
 */
export interface ApiMeta {
  /** Waktu pembuatan respons dalam format ISO 8601 UTC */
  timestamp: string;
  /** Mode data yang digunakan (live atau simulation) */
  dataMode: DataMode;
  /** Durasi waktu eksekusi logika backend dalam milidetik */
  processingTimeMs?: number;
  /** Nomor halaman saat ini (untuk endpoint dengan pagination) */
  page?: number;
  /** Jumlah item per halaman */
  pageSize?: number;
  /** Total seluruh item yang tersedia */
  total?: number;
}

/**
 * Amplop standar seragam untuk seluruh endpoint API Next.js AANG.
 * 
 * @template T Tipe payload data yang dikembalikan ketika sukses
 */
export interface ApiResponse<T> {
  /** Menandakan apakah operasi berhasil dieksekusi */
  success: boolean;
  /** Payload data jika sukses, atau null bila terjadi galat */
  data: T | null;
  /** Objek galat jika gagal, atau null jika operasi berhasil */
  error: ApiError | null;
  /** Metadata sistem terkait eksekusi permintaan */
  meta: ApiMeta;
}
