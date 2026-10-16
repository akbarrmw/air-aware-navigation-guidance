/**
 * Tipe data kandidat rute navigasi.
 */

import type { RouteLabel, LatLngTuple } from './common';

/**
 * Representasi rute navigasi alternatif yang dihasilkan dari mesin routing (OSRM).
 */
export interface RouteCandidate {
  /** Identifier unik internal untuk rute (contoh: 'route-0', 'route-1') */
  id: string;
  /** Label rute alternatif: 'A' (biasanya tercepat), 'B', atau 'C' */
  label: RouteLabel;
  /** Jarak tempuh total rute dalam meter */
  distanceMeters: number;
  /** Estimasi durasi tempuh perjalanan dalam detik */
  durationSeconds: number;
  /** Geometri lintasan rute dalam bentuk array koordinat [latitude, longitude] */
  geometry: {
    /** Array titik koordinat lintasan dengan urutan WAJIB [lat, lng] */
    coordinates: LatLngTuple[];
  };
  /** Penanda apakah rute ini memiliki durasi tersingkat dibanding alternatif lain */
  isFastest: boolean;
}
