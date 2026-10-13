import { StationData } from '@/types/air-quality';
import { ECOPULSE_PARAMS } from '@/config/parameters';

/**
 * Menghitung jarak Euclidean/Geodesik kasar (Haversine) antara dua titik koordinat dalam meter
 */
export function calculateDistanceMeters(
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

export interface IdwResult {
  estimatedValue: number | null;
  nearestStationDistanceM: number | null;
  usedStations: {
    stationId: string;
    stationName: string;
    distanceMeters: number;
    value: number;
    ageMinutes: number;
  }[];
}

/**
 * ALG-02: Inverse Distance Weighting (IDW) Interpolation
 */
export function interpolateIdw(
  targetLat: number,
  targetLng: number,
  stations: StationData[]
): IdwResult {
  // Hanya gunakan stasiun dengan PM2.5 valid dan tidak expired
  const validStations = stations
    .filter((s) => s.pm25Concentration !== null && s.freshness !== 'expired')
    .map((s) => ({
      ...s,
      distance: calculateDistanceMeters(targetLat, targetLng, s.lat, s.lng),
    }))
    .filter((s) => s.distance <= ECOPULSE_PARAMS.PAR_02_SEARCH_RADIUS_KM * 1000)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, ECOPULSE_PARAMS.PAR_03_MAX_NEAREST_STATIONS);

  if (validStations.length === 0) {
    return { estimatedValue: null, nearestStationDistanceM: null, usedStations: [] };
  }

  // Jika stasiun terdekat berada dalam batas anti-singularitas (epsilon 100m)
  const closest = validStations[0];
  if (closest.distance < ECOPULSE_PARAMS.PAR_11_ANTI_SINGULARITY_EPS_M) {
    return {
      estimatedValue: closest.pm25Concentration,
      nearestStationDistanceM: closest.distance,
      usedStations: validStations.map((s) => ({
        stationId: s.stationId,
        stationName: s.stationName,
        distanceMeters: Math.round(s.distance),
        value: s.pm25Concentration!,
        ageMinutes: s.ageMinutes,
      })),
    };
  }

  // Hitung bobot IDW: w_j = 1 / d_j^p
  const p = ECOPULSE_PARAMS.PAR_11_IDW_POWER;
  let totalWeight = 0;
  let weightedSum = 0;

  for (const st of validStations) {
    const weight = 1 / Math.pow(st.distance, p);
    totalWeight += weight;
    weightedSum += weight * st.pm25Concentration!;
  }

  const estimatedValue = Number((weightedSum / totalWeight).toFixed(1));

  return {
    estimatedValue,
    nearestStationDistanceM: Math.round(closest.distance),
    usedStations: validStations.map((s) => ({
      stationId: s.stationId,
      stationName: s.stationName,
      distanceMeters: Math.round(s.distance),
      value: s.pm25Concentration!,
      ageMinutes: s.ageMinutes,
    })),
  };
}
