/**
 * @file trips.ts
 * @description Kontrak data penyimpanan riwayat perjalanan, daftar trip pengguna, dan detail riwayat.
 * @author Person 1 (Core Algorithm & System Integration)
 * @module types/trips
 * @see CODE_SPEC_AANG.md Bagian 3.6 & Bagian 4.2
 */

import type { LatLng, LatLngTuple, LocationPoint } from './common';
import type { AqiCategoryCode } from './aqiScale';
import type { ConfidenceLevel, RouteExposureEstimate, AnalyzedRoute } from './algorithms';
import type { DataSourceInfo } from './analyze';
import type { RoutePreferences } from './preferences';

/**
 * Payload pengiriman data untuk menyimpan riwayat perjalanan (POST /api/trips).
 * Menyimpan snapshot rute yang dipilih pengguna.
 */
export interface TripSavePayload {
  /** Titik awal perjalanan */
  origin: LocationPoint;
  /** Titik tujuan perjalanan */
  destination: LocationPoint;
  /** Snapshot rute yang dipilih pengguna untuk disimpan */
  selectedRoute: AnalyzedRoute;
  /** Ringkasan metrik rute tercepat sebagai titik pembanding */
  fastest: {
    durationSeconds: number;
    exposureIndexPm25: number | null;
  };
  /** Apakah rute yang disimpan merupakan rute yang direkomendasikan sistem */
  wasRecommended: boolean;
  /** Bobot preferensi eksposur yang digunakan saat trip dibuat (0..1) */
  usedExposureWeight: number;
  /** Sumber data kualitas udara saat analisis dilakukan */
  dataSources: DataSourceInfo[];
  /** Versi algoritma yang digunakan */
  algorithmVersion: string;
  /** Moda transportasi perjalanan yang dipilih ('car' | 'motorcycle' | 'walk') */
  transportMode?: 'car' | 'motorcycle' | 'walk';
}

/**
 * Item ringkas riwayat perjalanan untuk tampilan daftar riwayat (GET /api/trips).
 */
export interface TripListItem {
  /** ID unik riwayat perjalanan (UUID) */
  tripId: string;
  /** Label nama tempat titik asal */
  originLabel: string;
  /** Label nama tempat titik tujuan */
  destinationLabel: string;
  /** Moda transportasi perjalanan */
  transportMode: 'car' | 'motorcycle' | 'walk';
  /** Waktu perjalanan dianalisis (ISO UTC string) */
  analyzedAt: string;
  /** Jarak tempuh dalam meter */
  distanceMeters: number;
  /** Durasi tempuh dalam detik */
  durationSeconds: number;
  /** Exposure index PM2.5 */
  exposureIndexPm25: number | null;
  /** Rata-rata konsentrasi PM2.5 (µg/m³) */
  avgPm25: number | null;
  /** Kategori kualitas udara umum */
  category: AqiCategoryCode | null;
  /** Tingkat keyakinan estimasi */
  confidenceLevel: ConfidenceLevel;
  /** Apakah rute yang dipilih adalah rekomendasi sistem */
  wasRecommended: boolean;
}

/**
 * Rincian mendalam riwayat perjalanan (GET /api/trips/:id).
 */
export interface TripDetail extends TripListItem {
  /** Koordinat titik awal */
  origin: LatLng;
  /** Koordinat titik tujuan */
  destination: LatLng;
  /** Geometri rute berupa array koordinat [latitude, longitude] */
  geometry: LatLngTuple[];
  /** Rasio cakupan stasiun saat rute dianalisis */
  coverageRatio: number | null;
  /** Sumber data polusi */
  dataSource: string;
  /** Data pembanding rute tercepat */
  fastest: {
    durationSeconds: number;
    exposureIndexPm25: number | null;
  };
  /** Bobot preferensi yang digunakan */
  usedExposureWeight: number;
  /** Rincian estimasi segmen dan stasiun jika tersedia dalam snapshot */
  estimate: RouteExposureEstimate | null;
  /** Versi algoritma saat rute dianalisis */
  algorithmVersion: string;
}

/**
 * Payload preferensi pengguna termasuk status persetujuan penyimpanan riwayat.
 */
export interface PreferencesPayload extends RoutePreferences {
  /** Status persetujuan pengguna untuk menyimpan riwayat perjalanan (Consent PRD) */
  historyConsent: boolean;
}
