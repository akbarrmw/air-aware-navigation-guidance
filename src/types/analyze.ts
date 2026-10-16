/**
 * Tipe data permohonan analisis rute dan payload respons lengkap.
 */

import type { DataType, LocationPoint } from './common';
import type { ApiWarning } from './api';
import type { RoutePreferences } from './preferences';
import type { DecisionResult } from './algorithms';

/**
 * Payload permintaan analisis rute (POST /api/routes/analyze).
 */
export interface AnalyzeRoutesRequest {
  /** Titik awal keberangkatan */
  origin: LocationPoint;
  /** Titik tujuan akhir */
  destination: LocationPoint;
  /** Preferensi pembobotan optimasi rute */
  preferences: RoutePreferences;
}

/**
 * Informasi atribusi dan transparansi sumber data kualitas udara.
 */
export interface DataSourceInfo {
  /** Nama penyedia data (contoh: 'BMKG', 'WAQI Semarang', 'KLHK') */
  sourceName: string;
  /** Tipe data (observasi stasiun, model fallback, atau simulasi) */
  dataType: DataType;
  /** Teks atribusi resmi dan hak cipta untuk dicantumkan pada UI */
  attributionText: string;
  /** Rentang observasi waktu stasiun jika tersedia */
  observedRange?: {
    /** Waktu observasi data tertua (ISO UTC string) */
    oldest: string;
    /** Waktu observasi data terbaru (ISO UTC string) */
    newest: string;
  };
}

/**
 * Payload data respons lengkap analisis rute (/api/routes/analyze).
 * Menggabungkan hasil keputusan rute, sumber data, peringatan operasional, dan disclaimer hukum.
 */
export interface AnalyzeRoutesResponseData extends DecisionResult {
  /** Daftar sumber data yang digunakan dalam analisis ini */
  dataSources: DataSourceInfo[];
  /** Daftar peringatan non-fatal yang relevan untuk pengguna */
  warnings: ApiWarning[];
  /** Disclaimer metodologi non-klinis (PRD Pasal 9.7) */
  disclaimer: string;
  /** Versi algoritma yang mengeksekusi kalkulasi */
  algorithmVersion: string;
}
