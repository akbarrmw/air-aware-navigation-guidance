/**
 * @file geoMath.ts
 * @description Utilitas matematika geodesik bumi (Haversine formula, panjang lintasan, interpolasi koordinat).
 * @author Person 1 (Core Algorithm & System Integration)
 * @module lib/algorithms/geoMath
 * @see CODE_SPEC_AANG.md Bagian 3.8 & Bagian 6 (ALG-01)
 */

import type { LatLngTuple } from '@/types/common';

/** Radius rata-rata bumi dalam meter (WGS 84 spherical approximation) */
export const EARTH_RADIUS_METERS = 6371000;

/**
 * Menghitung jarak lingkaran besar (Great-Circle Distance) antara dua koordinat geografis
 * menggunakan Formula Haversine dalam satuan meter.
 * 
 * @param a Koordinat titik awal [latitude, longitude]
 * @param b Koordinat titik akhir [latitude, longitude]
 * @returns Jarak dalam satuan meter (>= 0)
 * 
 * @example
 * ```ts
 * const distance = haversineMeters([-7.0514, 110.4388], [-6.9928, 110.4222]);
 * ```
 */
export function haversineMeters(a: LatLngTuple, b: LatLngTuple): number {
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;

  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;

  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLon = Math.sin(dLon / 2);

  const h =
    sinHalfLat * sinHalfLat +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * sinHalfLon * sinHalfLon;

  const clampedH = Math.min(1, Math.max(0, h));
  const c = 2 * Math.atan2(Math.sqrt(clampedH), Math.sqrt(1 - clampedH));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Menghitung jarak Haversine dalam satuan meter dengan 4 parameter angka (lat1, lon1, lat2, lon2).
 * 
 * @param lat1 Latitude titik 1
 * @param lon1 Longitude titik 1
 * @param lat2 Latitude titik 2
 * @param lon2 Longitude titik 2
 * @returns Jarak dalam meter
 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  return haversineMeters([lat1, lon1], [lat2, lon2]);
}

/**
 * Menghitung total jarak kumulatif dari suatu polyline lintasan koordinat.
 * 
 * @param path Array koordinat [lat, lng]
 * @returns Total panjang lintasan dalam meter
 */
export function pathLengthMeters(path: LatLngTuple[]): number {
  if (path.length < 2) return 0;

  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    total += haversineMeters(path[i], path[i + 1]);
  }

  return total;
}

/**
 * Melakukan interpolasi linear koordinat antara titik a dan b pada fraksi jarak tertentu (0.0 s/d 1.0).
 * 
 * @param a Titik pangkal [lat, lng]
 * @param b Titik ujung [lat, lng]
 * @param fraction Proporsi jarak dari a ke b (0.0 = a, 1.0 = b)
 * @returns Koordinat terinterpolasi [lat, lng]
 */
export function interpolatePoint(
  a: LatLngTuple,
  b: LatLngTuple,
  fraction: number
): LatLngTuple {
  const t = Math.max(0, Math.min(1, fraction));
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
  ];
}
