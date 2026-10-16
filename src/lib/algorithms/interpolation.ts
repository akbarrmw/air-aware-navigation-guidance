/**
 * Modul interpolasi spasial Inverse Distance Weighting (IDW) dengan ambang anti-singularitas.
 */

import type { LatLngTuple } from '@/types/common';
import type { StationData } from '@/types/air-quality';
import type { AlgorithmParams, IdwResult, StationUsed, UncertaintyClass } from '@/types/algorithms';
import { DEFAULT_ALGORITHM_PARAMS } from '@/config/parameters';
import { haversineMeters, haversineDistanceMeters } from './geoMath';

/**
 * Alias fungsi penghitung jarak Haversine (kompatibilitas mundur).
 */
export const calculateDistanceMeters = haversineDistanceMeters;

/**
 * Melakukan interpolasi spasial Inverse Distance Weighting (IDW) pada satu titik koordinat.
 */
export function idwAtPoint(
  point: LatLngTuple,
  stations: StationData[],
  params: AlgorithmParams = DEFAULT_ALGORITHM_PARAMS
): IdwResult {
  const [targetLat, targetLng] = point;
  const maxRadiusM = params.stationRadiusMeters;
  const maxAgeMinutes = params.expiredAfterMinutes;

  // 1. Filter stasiun yang memenuhi kriteria validitas data dan jarak
  const validCandidateStations = stations
    .filter((s) => {
      // Wajib memiliki data PM2.5 valid
      if (s.pm25Concentration === null || isNaN(s.pm25Concentration)) {
        return false;
      }
      // Tolak data yang berstatus expired atau usianya melewati ambang batas kedaluwarsa
      if (s.freshness === 'expired') {
        return false;
      }
      if (s.ageMinutes !== null && s.ageMinutes > maxAgeMinutes) {
        return false;
      }
      return true;
    })
    .map((s) => ({
      ...s,
      distance: haversineMeters([targetLat, targetLng], [s.lat, s.lng]),
    }))
    .filter((s) => s.distance <= maxRadiusM)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, params.nearestStationCount);

  // Kasus: tidak ada stasiun valid dalam radius pencarian (TC-04)
  if (validCandidateStations.length === 0) {
    return {
      pm25: null,
      stationsUsed: [],
      nearestDistanceMeters: null,
      uncertaintyClass: 'none',
    };
  }

  const closest = validCandidateStations[0];
  const nearestDistanceMeters = Math.round(closest.distance);

  // Penentuan kelas ketidakpastian berdasarkan jarak terdekat (PAR-06)
  const uncertaintyClass: UncertaintyClass =
    nearestDistanceMeters <= params.nearDistanceMeters ? 'near' : 'medium';

  const mappedStationsUsed: StationUsed[] = validCandidateStations.map((s) => ({
    stationId: s.stationId,
    stationName: s.stationName,
    distanceMeters: Math.round(s.distance),
    pm25: s.pm25Concentration!,
    ageMinutes: s.ageMinutes,
    freshness: s.freshness,
    dataType: s.dataType,
    lat: s.lat,
    lng: s.lng,
  }));

  // 2. Anti-singularitas: jika titik berada sangat dekat dengan stasiun (< 100m)
  if (closest.distance < params.idwEpsilonMeters) {
    return {
      pm25: closest.pm25Concentration,
      stationsUsed: mappedStationsUsed,
      nearestDistanceMeters,
      uncertaintyClass: 'near',
    };
  }

  // Kasus stasiun tunggal
  if (validCandidateStations.length === 1) {
    return {
      pm25: closest.pm25Concentration,
      stationsUsed: mappedStationsUsed,
      nearestDistanceMeters,
      uncertaintyClass,
    };
  }

  // 3. Hitung pembobotan IDW: w_j = 1 / d_j^p
  const p = params.idwPower;
  let totalWeight = 0;
  let weightedSum = 0;

  for (const st of validCandidateStations) {
    // Jarak aman anti-pembagian dengan nol
    const safeDistance = Math.max(st.distance, 1.0);
    const weight = 1 / Math.pow(safeDistance, p);
    totalWeight += weight;
    weightedSum += weight * st.pm25Concentration!;
  }

  if (totalWeight <= 0) {
    return {
      pm25: null,
      stationsUsed: mappedStationsUsed,
      nearestDistanceMeters,
      uncertaintyClass: 'none',
    };
  }

  const estimatedValue = Number((weightedSum / totalWeight).toFixed(1));

  return {
    pm25: estimatedValue,
    stationsUsed: mappedStationsUsed,
    nearestDistanceMeters,
    uncertaintyClass,
  };
}

/**
 * Melakukan interpolasi IDW untuk koordinat latitude dan longitude.
 */
export function interpolateIdw(
  targetLat: number,
  targetLng: number,
  stations: StationData[],
  params: AlgorithmParams = DEFAULT_ALGORITHM_PARAMS
) {
  const result = idwAtPoint([targetLat, targetLng], stations, params);
  return {
    estimatedValue: result.pm25,
    nearestStationDistanceM: result.nearestDistanceMeters,
    nearestDistanceMeters: result.nearestDistanceMeters,
    usedStations: result.stationsUsed.map((s) => ({
      stationId: s.stationId,
      stationName: s.stationName,
      distanceMeters: s.distanceMeters,
      value: s.pm25,
      ageMinutes: s.ageMinutes,
    })),
  };
}
