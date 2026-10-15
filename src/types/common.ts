/**
 * @file common.ts
 * @description Tipe data primitif dan domain bersama untuk sistem AANG (Air-Aware Navigation Guidance).
 * @author Person 1 (Core Algorithm & System Integration)
 * @module types/common
 * @see CODE_SPEC_AANG.md Bagian 3.1
 */

/**
 * Label penanda rute alternatif navigasi.
 * Mengikuti konvensi 3 opsi rute standar (A: Tercepat, B: Alternatif 1, C: Alternatif 2).
 */
export type RouteLabel = 'A' | 'B' | 'C';

/**
 * Mode operasional sumber data aplikasi:
 * - `live`: Mengambil data nyata dari layanan upstream (WAQI, OSRM, dsb.)
 * - `simulation`: Menggunakan data fixture/mock statis untuk evaluasi atau demo
 */
export type DataMode = 'live' | 'simulation';

/**
 * Sumber origin data kualitas udara yang mendasari kalkulasi:
 * - `station_observation`: Data observasi fisik dari stasiun pemantau resmi
 * - `model_fallback`: Estimasi berbasis model jika stasiun fisik tidak tersedia
 * - `simulation`: Data simulasi sintetis
 */
export type DataType = 'station_observation' | 'model_fallback' | 'simulation';

/**
 * Koordinat geografis format objek { lat, lng }.
 */
export interface LatLng {
  /** Latitude dalam derajat desimal (-90 hingga 90) */
  lat: number;
  /** Longitude dalam derajat desimal (-180 hingga 180) */
  lng: number;
}

/**
 * Tuple koordinat geografis dengan URUTAN WAJIB: [latitude, longitude].
 * 
 * PERHATIAN:
 * Layanan OSRM dan standar GeoJSON menggunakan urutan [longitude, latitude].
 * Konversi balik hanya dilakukan pada routingService / adapter internal.
 * Seluruh kontrak internal AANG konsisten memakai [latitude, longitude].
 */
export type LatLngTuple = [number, number];

/**
 * Kotak batas wilayah geografis (Bounding Box).
 */
export interface BoundingBox {
  /** Batas selatan (latitude minimal) */
  south: number;
  /** Batas barat (longitude minimal) */
  west: number;
  /** Batas utara (latitude maksimal) */
  north: number;
  /** Batas timur (longitude maksimal) */
  east: number;
}

/**
 * Representasi titik lokasi dengan koordinat dan label opsional (alamat / nama tempat).
 */
export interface LocationPoint {
  /** Label nama tempat, alamat, atau nama fasilitas */
  label?: string;
  /** Latitude lokasi */
  lat: number;
  /** Longitude lokasi */
  lng: number;
}
