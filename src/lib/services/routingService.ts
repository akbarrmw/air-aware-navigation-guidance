import { CONSTANTS } from '@/config/constants';
import { RouteCandidate } from '@/types/routing';
import { fetchWithTimeout } from '@/lib/utils/fetchWithTimeout';
import { appCache } from '@/lib/utils/cache';
import { processRouteCandidates, RawRouteInput } from './routeCandidates';
import { MOCK_ROUTES } from '@/fixtures/mockRoutes';
import { ECOPULSE_PARAMS } from '@/config/parameters';

export interface RoutePoint {
  lat: number;
  lng: number;
}

export class RoutingServiceError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number = 400) {
    super(message);
    this.name = 'RoutingServiceError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Utilitas jarak cepat untuk validasi jarak minimum asal-tujuan (100 meter)
 */
function getApproxDistanceMeters(p1: RoutePoint, p2: RoutePoint): number {
  const R = 6371000;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface OsrmRouteResponse {
  code: string;
  message?: string;
  routes?: Array<{
    distance: number; // meter
    duration: number; // detik
    geometry: {
      coordinates: [number, number][]; // [lng, lat]
    };
    legs?: Array<{
      steps?: Array<{
        name?: string;
        ref?: string;
        distance?: number;
        duration?: number;
      }>;
    }>;
  }>;
}

/**
 * Mendeteksi apakah suatu step rute merupakan ruas jalan tol.
 */
export function isTollStep(step: { name?: string; ref?: string }): boolean {
  const name = (step.name || '').toLowerCase();
  const ref = (step.ref || '').toLowerCase();
  return (
    /\b(tol|toll\w*|motorway)\b/i.test(name) ||
    /\b(tol|toll\w*|motorway)\b/i.test(ref) ||
    name.includes('jalan tol') ||
    name.includes('gerbang tol') ||
    name.includes('pintu tol') ||
    ref.includes('jalan tol')
  );
}

/**
 * Mendeteksi apakah kandidat rute melewati jalan tol.
 * Memberi batas toleransi 150 meter untuk menghindari false positive pada ramp akses lokal OSM.
 */
export function routeHasToll(route: {
  legs?: Array<{ steps?: Array<{ name?: string; ref?: string; distance?: number }> }>;
}): boolean {
  if (!route.legs) return false;
  let tollDistance = 0;
  for (const leg of route.legs) {
    if (!leg.steps) continue;
    for (const step of leg.steps) {
      if (isTollStep(step)) {
        tollDistance += step.distance || 0;
      }
    }
  }
  return tollDistance > 150;
}

/**
 * Mencari rute alternatif yang realistis dengan pengaman (Guarded Diversification)
 * Mendukung penghindaran jalan tol secara otomatis jika diminta (mustAvoidToll = true)
 * serta adaptasi toleransi waktu/jarak untuk rute tol vs arteri pada seluruh moda transportasi.
 */
async function fetchGuardedAlternativeRoute(
  origin: RoutePoint,
  destination: RoutePoint,
  primaryRoute: RawRouteInput,
  directDistance: number,
  mustAvoidToll: boolean = false,
  primaryHasToll: boolean = false
): Promise<RawRouteInput | null> {
  // Hanya aktif untuk perjalanan perkotaan / sub-urban (1.5 km s/d 60 km)
  if (directDistance < 1500 || directDistance > 60000) {
    return null;
  }

  // Hitung offset tegak lurus (perpendicular offset) dari koridor origin-dest
  const dLat = destination.lat - origin.lat;
  const dLng = destination.lng - origin.lng;
  const len = Math.sqrt(dLat * dLat + dLng * dLng);
  if (len === 0) return null;

  const baseOffset = Math.min(len * 0.12, 0.015);
  const normLat = -dLng / len;
  const normLng = dLat / len;

  const midLat = (origin.lat + destination.lat) / 2;
  const midLng = (origin.lng + destination.lng) / 2;

  // Coba titik perantara di dua sisi koridor dengan variasi jarak offset yang adaptif untuk seluruh moda
  const multiplierList = [-1, 1, -1.8, 1.8, -2.8, 2.8, -0.6, 0.6];

  const viaCandidates = multiplierList.map((m) => ({
    lat: midLat + normLat * (baseOffset * m),
    lng: midLng + normLng * (baseOffset * m),
  }));

  for (const via of viaCandidates) {
    try {
      const url = `${CONSTANTS.DEFAULT_ROUTING_URL}/route/v1/driving/${origin.lng},${origin.lat};${via.lng.toFixed(5)},${via.lat.toFixed(5)};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`;
      const res = await fetchWithTimeout(url, { timeoutMs: 3500 });
      if (!res.ok) continue;

      const data: OsrmRouteResponse = await res.json();
      if (data.code === 'Ok' && Array.isArray(data.routes) && data.routes.length > 0) {
        const alt = data.routes[0];
        const altHasToll = routeHasToll(alt);

        // Jika mode melarang jalan tol, pastikan rute alternatif benar-benar bebas tol
        if (mustAvoidToll && altHasToll) {
          continue;
        }

        // Toleransi guardrails:
        // Jika rute utama memakai jalan tol atau moda harus menghindari tol, rute arteri non-tol wajar memakan waktu/jarak lebih lama (hingga 2.5x)
        // Untuk koridor non-tol perkotaan, toleransi waktu hingga 1.65x (sesuai toleransi ekstra waktu di slider UI)
        const isTollDivergence = mustAvoidToll || primaryHasToll;
        const maxTimeMultiplier = isTollDivergence ? 2.5 : 1.65;
        const maxDistMultiplier = isTollDivergence ? 2.2 : 1.60;

        const isTimeAcceptable = alt.duration <= primaryRoute.durationSeconds * maxTimeMultiplier;
        const isDistAcceptable = alt.distance <= primaryRoute.distanceMeters * maxDistMultiplier;
        const isDistinct =
          primaryHasToll !== altHasToll ||
          Math.abs(alt.duration - primaryRoute.durationSeconds) >= 15 ||
          Math.abs(alt.distance - primaryRoute.distanceMeters) >= 150;

        if (isTimeAcceptable && isDistAcceptable && isDistinct) {
          return {
            distanceMeters: alt.distance,
            durationSeconds: alt.duration,
            coordinates: alt.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
          };
        }
      }
    } catch {
      // Abaikan kegagalan via point dan coba opsi berikutnya
    }
  }

  return null;
}

/**
 * Service Routing Utama (OSRM)
 * Menghitung rute navigasi riil di seluruh jaringan jalan Indonesia
 * Mendukung pemilihan moda (mobil, motor, pejalan kaki) dengan aturan jalan tol dan kecepatan homogen.
 * Pemilik: Person 2 (Backend Services)
 */
export async function getRouteAlternatives(
  origin: RoutePoint,
  destination: RoutePoint,
  transportMode: 'car' | 'motorcycle' | 'walk' = 'car'
): Promise<RouteCandidate[]> {
  // 1. Validasi jarak minimum 100 meter
  const directDistance = getApproxDistanceMeters(origin, destination);
  if (directDistance < 100) {
    throw new RoutingServiceError(
      'Jarak antara titik asal dan tujuan terlalu dekat (minimal 100 meter).',
      'VALIDATION_ERROR',
      400
    );
  }

  // 2. Cache check berdasarkan moda dan koordinat dibulatkan (4 desimal ~ 11 meter)
  const cacheKey = `osrm_${transportMode}_${origin.lat.toFixed(4)}_${origin.lng.toFixed(4)}_${destination.lat.toFixed(4)}_${destination.lng.toFixed(4)}`;
  const cached = appCache.get<RouteCandidate[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // Helper kalkulasi durasi perjalanan berdasarkan kecepatan homogen per moda
  const calculateModeDuration = (distanceMeters: number, rawCarDurationSeconds: number): number => {
    if (transportMode === 'walk') {
      // Kecepatan homogen pejalan kaki: 4.8 km/jam = 1.333 m/detik
      return Math.round(distanceMeters / 1.3333);
    }
    if (transportMode === 'motorcycle') {
      // Sepeda motor di jalan arteri non-tol: kecepatan homogen ~32 km/jam (8.89 m/s).
      // Pada rute perkotaan non-tol, sepeda motor memiliki efisiensi ~0.90x waktu mobil (kelincahan kemacetan)
      return Math.round(Math.min(rawCarDurationSeconds * 0.90, distanceMeters / 8.89));
    }
    // Mobil: durasi standar OSRM driving
    return Math.round(rawCarDurationSeconds);
  };

  // 3. Selalu coba memanggil OSRM nyata terlebih dahulu
  try {
    const url = `${CONSTANTS.DEFAULT_ROUTING_URL}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&alternatives=true&steps=true`;

    const res = await fetchWithTimeout(url, {
      timeoutMs: ECOPULSE_PARAMS.PAR_13_TIMEOUT_ROUTING_MS,
    });

    if (res.ok) {
      const json: OsrmRouteResponse = await res.json();

      if (json.code === 'Ok' && Array.isArray(json.routes) && json.routes.length > 0) {
        let validOsrmRoutes = json.routes;

        // Sepeda motor dan pejalan kaki DILARANG melewati jalan tol
        const mustAvoidToll = transportMode === 'motorcycle' || transportMode === 'walk';

        if (mustAvoidToll) {
          validOsrmRoutes = validOsrmRoutes.filter((r) => !routeHasToll(r));
        }

        // Jika semua rute OSRM melewati jalan tol, secara aktif cari rute arteri alternatif non-tol
        if (validOsrmRoutes.length === 0 && mustAvoidToll) {
          const tollPrimaryRaw: RawRouteInput = {
            distanceMeters: json.routes[0].distance,
            durationSeconds: json.routes[0].duration,
            coordinates: json.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
          };

          const nonTollRoute = await fetchGuardedAlternativeRoute(
            origin,
            destination,
            tollPrimaryRaw,
            directDistance,
            true,
            true
          );

          if (nonTollRoute) {
            validOsrmRoutes = [
              {
                distance: nonTollRoute.distanceMeters,
                duration: nonTollRoute.durationSeconds,
                geometry: {
                  coordinates: nonTollRoute.coordinates.map(([lat, lng]) => [lng, lat] as [number, number]),
                },
              },
            ];
          }
        }

        if (validOsrmRoutes.length > 0) {
          // Konversi koordinat [lng, lat] -> [lat, lng] dan terapkan penyesuaian kecepatan homogen per moda
          const rawRoutes: RawRouteInput[] = validOsrmRoutes.map((r) => ({
            distanceMeters: r.distance,
            durationSeconds: calculateModeDuration(r.distance, r.duration),
            coordinates: r.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
          }));

          // Jika hanya ada 1 rute tunggal, cari alternatif diversifikasi tambahan
          if (rawRoutes.length === 1) {
            const primaryOsrm = validOsrmRoutes[0];
            const primaryHasToll = routeHasToll(primaryOsrm);
            const guardedAlt = await fetchGuardedAlternativeRoute(
              origin,
              destination,
              {
                distanceMeters: primaryOsrm.distance,
                durationSeconds: primaryOsrm.duration,
                coordinates: rawRoutes[0].coordinates,
              },
              directDistance,
              mustAvoidToll,
              primaryHasToll
            );

            if (guardedAlt) {
              rawRoutes.push({
                distanceMeters: guardedAlt.distanceMeters,
                durationSeconds: calculateModeDuration(guardedAlt.distanceMeters, guardedAlt.durationSeconds),
                coordinates: guardedAlt.coordinates,
              });
            }
          }

          // Filter, urutkan, beri label A/B/C dan isFastest
          const processedRoutes = processRouteCandidates(rawRoutes);

          if (processedRoutes.length > 0) {
            appCache.set(cacheKey, processedRoutes, 5);
            return processedRoutes;
          }
        }
      }
    }
  } catch (err) {
    console.warn('[RoutingService] OSRM live service unreachable, checking fallback:', err);
  }

  // 4. Fallback jika OSRM tidak dapat dihubungi dan mode simulasi aktif
  const isSimulation = process.env.DATA_MODE === 'simulation';
  if (isSimulation) {
    const fallbackCoords: [number, number][] = [
      [origin.lat, origin.lng],
      [(origin.lat * 2 + destination.lat) / 3, (origin.lng * 2 + destination.lng) / 3],
      [(origin.lat + destination.lat * 2) / 3, (origin.lng + destination.lng * 2) / 3],
      [destination.lat, destination.lng],
    ];

    let durationSec = Math.max(300, Math.round(directDistance / 10)); // mobil ~36 km/jam
    if (transportMode === 'motorcycle') {
      durationSec = Math.max(300, Math.round(directDistance / 8.89)); // motor ~32 km/jam
    } else if (transportMode === 'walk') {
      durationSec = Math.max(600, Math.round(directDistance / 1.3333)); // pejalan ~4.8 km/jam
    }

    const adaptiveRoute: RouteCandidate = {
      id: 'route-adaptive-0',
      label: 'A',
      isFastest: true,
      distanceMeters: Math.round(directDistance * 1.3),
      durationSeconds: durationSec,
      geometry: {
        coordinates: fallbackCoords,
      },
    };

    return [adaptiveRoute];
  }

  throw new RoutingServiceError(
    'Tidak ditemukan rute darat yang menghubungkan titik asal dan tujuan.',
    'NO_ROUTE_FOUND',
    422
  );
}
