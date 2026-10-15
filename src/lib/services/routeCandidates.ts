import { RouteCandidate } from '@/types/routing';
import { ECOPULSE_PARAMS } from '@/config/parameters';

/**
 * Utilitas jarak Haversine internal Person 2 (tanpa dependensi ke modul Person 1)
 */
function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius bumi dalam meter
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Menghitung tingkat kemiripan / tumpang tindih antara dua polyline rute (0.0 s/d 1.0)
 */
function calculateRouteOverlapRatio(
  coordsA: [number, number][],
  coordsB: [number, number][]
): number {
  if (coordsA.length === 0 || coordsB.length === 0) return 0;

  let matchedPoints = 0;
  const thresholdMeters = 50; // Titik dianggap sama jika berada dalam 50 meter

  for (const [latA, lngA] of coordsA) {
    const isNearby = coordsB.some(
      ([latB, lngB]) => haversineDistanceMeters(latA, lngA, latB, lngB) <= thresholdMeters
    );
    if (isNearby) matchedPoints++;
  }

  return matchedPoints / coordsA.length;
}

export interface RawRouteInput {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: [number, number][]; // [lat, lng]
}

/**
 * Memproses dan menyaring rute mentah:
 * 1. Menghapus rute duplikat / tumpang tindih (> PAR_10_ROUTE_OVERLAP_THRESHOLD = 90%)
 * 2. Mengurutkan berdasarkan durasi (tercepat pertama)
 * 3. Membatasi maksimal 3 rute alternatif (A, B, C)
 * 4. Menandai isFastest dan menetapkan label
 * Pemilik: Person 2 (Backend Services)
 */
export function processRouteCandidates(rawRoutes: RawRouteInput[]): RouteCandidate[] {
  if (!rawRoutes || rawRoutes.length === 0) {
    return [];
  }

  // 1. Urutkan berdasarkan durasi tersingkat
  const sorted = [...rawRoutes].sort((a, b) => a.durationSeconds - b.durationSeconds);

  // 2. Buang hanya rute yang benar-benar duplikat / tumpang tindih tinggi
  // Memastikan rute alternatif B dan C yang memiliki perbedaan jalur atau durasi tetap tampil
  const uniqueRoutes: RawRouteInput[] = [];

  for (const route of sorted) {
    const isDuplicate = uniqueRoutes.some((existing) => {
      const overlap = calculateRouteOverlapRatio(route.coordinates, existing.coordinates);
      const durationDiffSeconds = Math.abs(route.durationSeconds - existing.durationSeconds);

      // Duplikat jika koordinat identik (>= 98%) atau overlap >= 90% dengan selisih waktu nyaris sama (< 30 detik)
      return overlap >= 0.98 || (overlap >= ECOPULSE_PARAMS.PAR_10_ROUTE_OVERLAP_THRESHOLD && durationDiffSeconds < 30);
    });

    if (!isDuplicate) {
      uniqueRoutes.push(route);
    }
  }

  // 3. Batasi maksimal 3 rute
  const topCandidates = uniqueRoutes.slice(0, 3);
  const labels: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];

  return topCandidates.map((route, index) => ({
    id: `route-${index}`,
    label: labels[index] || 'C',
    distanceMeters: Math.round(route.distanceMeters),
    durationSeconds: Math.round(route.durationSeconds),
    geometry: {
      coordinates: route.coordinates,
    },
    isFastest: index === 0,
  }));
}
