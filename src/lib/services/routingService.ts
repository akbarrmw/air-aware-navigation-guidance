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
  }>;
}

/**
 * Service Routing Utama (OSRM)
 * Pemilik: Person 2 (Backend Services)
 */
export async function getRouteAlternatives(
  origin: RoutePoint,
  destination: RoutePoint
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

  const isSimulation = process.env.DATA_MODE === 'simulation';
  if (isSimulation) {
    return MOCK_ROUTES;
  }

  // 2. Cache check berdasarkan koordinat dibulatkan (4 desimal ~ 11 meter)
  const cacheKey = `osrm_${origin.lat.toFixed(4)}_${origin.lng.toFixed(4)}_${destination.lat.toFixed(4)}_${destination.lng.toFixed(4)}`;
  const cached = appCache.get<RouteCandidate[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // 3. Format OSRM: {longitude},{latitude};{longitude},{latitude}
    const url = `${CONSTANTS.DEFAULT_ROUTING_URL}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&alternatives=true`;

    const res = await fetchWithTimeout(url, {
      timeoutMs: ECOPULSE_PARAMS.PAR_13_TIMEOUT_ROUTING_MS,
    });

    if (!res.ok) {
      throw new RoutingServiceError(
        'Gagal menghubungi server routing',
        'ROUTING_SERVER_ERROR',
        502
      );
    }

    const json: OsrmRouteResponse = await res.json();

    if (json.code !== 'Ok' || !json.routes || json.routes.length === 0) {
      throw new RoutingServiceError(
        'Tidak ditemukan rute darat yang menghubungkan titik asal dan tujuan.',
        'NO_ROUTE_FOUND',
        422
      );
    }

    // 4. Konversi koordinat [lng, lat] -> [lat, lng] untuk setiap rute
    const rawRoutes: RawRouteInput[] = json.routes.map((r) => ({
      distanceMeters: r.distance,
      durationSeconds: r.duration,
      coordinates: r.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
    }));

    // 5. Filter, urutkan, beri label A/B/C dan isFastest
    const processedRoutes = processRouteCandidates(rawRoutes);

    if (processedRoutes.length === 0) {
      throw new RoutingServiceError(
        'Tidak ada rute alternatif yang valid.',
        'NO_ROUTE_FOUND',
        422
      );
    }

    // 6. Cache hasil selama 5 menit
    appCache.set(cacheKey, processedRoutes, 5);

    return processedRoutes;
  } catch (err: unknown) {
    if (err instanceof RoutingServiceError) {
      throw err;
    }
    console.error('[RoutingService] Error:', err);
    throw new RoutingServiceError(
      'Terjadi kendala saat menghitung alternatif rute navigasi.',
      'ROUTING_FAILED',
      500
    );
  }
}
