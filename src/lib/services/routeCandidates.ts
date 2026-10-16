import { RouteCandidate } from '@/types/routing';

export interface RawRouteInput {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: [number, number][]; // [lat, lng]
}

/**
 * Memproses kandidat rute yang didapat dari penyedia rute (OSRM):
 * 1. Mengurutkan berdasarkan durasi (tercepat pertama sebagai baseline)
 * 2. Membatasi maksimal 3 rute alternatif (A, B, C)
 * 3. Menandai isFastest dan menetapkan label rute
 * 
 * Aturan penyaringan kemiripan (overlap) dinonaktifkan sehingga seluruh rute alternatif
 * yang didapat dari mesin routing ditampilkan secara langsung dan transparan kepada pengguna.
 */
export function processRouteCandidates(rawRoutes: RawRouteInput[]): RouteCandidate[] {
  if (!rawRoutes || rawRoutes.length === 0) {
    return [];
  }

  // 1. Urutkan berdasarkan durasi tersingkat
  const sorted = [...rawRoutes].sort((a, b) => a.durationSeconds - b.durationSeconds);

  // 2. Ambil seluruh rute yang didapat (maksimal 3 rute: A, B, C)
  const topCandidates = sorted.slice(0, 3);
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
