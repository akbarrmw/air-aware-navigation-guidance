/**
 * @file exposure.ts
 * @description Modul estimasi paparan polusi akumulatif sepanjang rute (ALG-01).
 * Mengintegrasikan konsentrasi PM2.5 tiap segmen terinterpolasi terhadap waktu tempuh.
 * 
 * @author Person 1 (Core Algorithm & System Integration)
 * @module lib/algorithms/exposure
 * @see CODE_SPEC_AANG.md Bagian 3.8 & Bagian 6 (ALG-01, FR-05, FR-09)
 */

import type { StationData } from '@/types/air-quality';
import type { RouteCandidate } from '@/types/routing';
import type {
  RouteExposureEstimate,
  AlgorithmParams,
  SegmentExposure,
  StationUsed,
  ConfidenceLevel,
} from '@/types/algorithms';
import { DEFAULT_ALGORITHM_PARAMS } from '@/config/parameters';
import { pm25ToCategory } from './aqiConversion';
import { splitPath } from './segmentation';
import { interpolateIdw } from './interpolation';

/**
 * Parameter input untuk kalkulasi paparan polusi rute.
 */
export interface ComputeRouteExposureInput {
  route: RouteCandidate;
  stations: StationData[];
  params?: AlgorithmParams;
  now?: string;
}

/**
 * ALG-01: Menghitung estimasi paparan polusi udara akumulatif untuk suatu kandidat rute.
 * 
 * Rumus dasar:
 * EI = Σ (PM2.5_segmen × Δt_segmen_menit)
 * 
 * @param input Objek parameter input rute, stasiun pemantau, konfigurasi params, dan waktu observasi
 * @returns RouteExposureEstimate lengkap berisi Exposure Index, segmen-segmen, dan stasiun yang digunakan
 */
export function computeRouteExposure(input: ComputeRouteExposureInput): RouteExposureEstimate {
  const { route, stations } = input;
  const coords = route.geometry.coordinates;
  const totalDurationMin = route.durationSeconds / 60;
  const totalDistanceM = route.distanceMeters;

  // Kasus geometri tidak valid atau rute kosong
  if (coords.length < 2 || totalDistanceM <= 0 || totalDurationMin <= 0) {
    return {
      exposureIndexPm25: null,
      avgPm25: null,
      category: null,
      coverageRatio: 0,
      confidenceLevel: 'unavailable',
      maxDataAgeMinutes: null,
      isPartiallyImputed: false,
      segments: [],
      topContributors: [],
      stationsUsed: [],
    };
  }

  // 1. Pemotongan rute menjadi segmen diskrit per PAR-01 (default 500m)
  const pathSegments = splitPath(coords, input.params?.segmentLengthMeters ?? 500);
  const segments: SegmentExposure[] = [];
  const stationsMap = new Map<string, StationUsed>();
  let validDataDurationMin = 0;
  let maxAge: number | null = null;
  let nearbyStationsDurationMin = 0;

  // 2. Evaluasi setiap segmen
  for (let i = 0; i < pathSegments.length; i++) {
    const seg = pathSegments[i];
    const segDurationSec = (seg.lengthMeters / totalDistanceM) * route.durationSeconds;
    const midPoint = seg.coordinates[Math.floor(seg.coordinates.length / 2)] || seg.coordinates[0];

    const idwRes = interpolateIdw(midPoint[0], midPoint[1], stations);

    if (idwRes.estimatedValue !== null) {
      validDataDurationMin += segDurationSec / 60;

      for (const st of idwRes.usedStations) {
        if (!stationsMap.has(st.stationId)) {
          const originalStation = stations.find((s) => s.stationId === st.stationId);
          stationsMap.set(st.stationId, {
            stationId: st.stationId,
            stationName: st.stationName,
            distanceMeters: st.distanceMeters,
            pm25: st.value,
            ageMinutes: st.ageMinutes,
            freshness: originalStation?.freshness ?? 'fresh',
            dataType: originalStation?.dataType ?? 'simulation',
          });
        }
        if (st.ageMinutes !== null) {
          maxAge = maxAge === null ? st.ageMinutes : Math.max(maxAge, st.ageMinutes);
        }
      }

      if (idwRes.nearestDistanceMeters !== null && idwRes.nearestDistanceMeters <= 3000) {
        nearbyStationsDurationMin += segDurationSec / 60;
      }
    }

    segments.push({
      segmentIndex: i,
      startKm: Number((seg.startDistanceMeters / 1000).toFixed(2)),
      endKm: Number((seg.endDistanceMeters / 1000).toFixed(2)),
      path: seg.coordinates,
      durationSeconds: Math.round(segDurationSec),
      pm25: idwRes.estimatedValue,
      category: pm25ToCategory(idwRes.estimatedValue),
      uncertaintyClass:
        idwRes.nearestDistanceMeters === null
          ? 'none'
          : idwRes.nearestDistanceMeters <= 3000
          ? 'near'
          : 'medium',
      contributionPercent: null,
    });
  }

  // 3. Rasio cakupan segmen berdata
  const coverageRatio = Number((validDataDurationMin / totalDurationMin).toFixed(2));

  // Jika cakupan di bawah PAR-08 (20%), estimasi dianggap tidak valid
  if (coverageRatio < (input.params?.minCoverageRatio ?? 0.2)) {
    return {
      exposureIndexPm25: null,
      avgPm25: null,
      category: null,
      coverageRatio,
      confidenceLevel: 'unavailable',
      maxDataAgeMinutes: maxAge,
      isPartiallyImputed: false,
      segments,
      topContributors: [],
      stationsUsed: Array.from(stationsMap.values()),
    };
  }

  // 4. Hitung rata-rata konsentrasi segmen berdata
  let sumWeightedPm25 = 0;
  for (const seg of segments) {
    if (seg.pm25 !== null) {
      sumWeightedPm25 += seg.pm25 * (seg.durationSeconds / 60);
    }
  }

  const avgKnownPm25 = validDataDurationMin > 0 ? sumWeightedPm25 / validDataDurationMin : 0;
  let isPartiallyImputed = false;

  // Imputasi segmen yang tidak memiliki data dengan nilai rata-rata segmen berdata
  for (const seg of segments) {
    if (seg.pm25 === null) {
      isPartiallyImputed = true;
      seg.pm25 = Number(avgKnownPm25.toFixed(1));
      seg.category = pm25ToCategory(seg.pm25);
    }
  }

  // 5. Hitung total Exposure Index (EI)
  let totalEI = 0;
  for (const seg of segments) {
    const segEI = (seg.pm25 || 0) * (seg.durationSeconds / 60);
    totalEI += segEI;
  }
  totalEI = Number(totalEI.toFixed(1));
  const avgPm25 = Number((totalEI / totalDurationMin).toFixed(1));

  // Hitung persentase kontribusi per segmen
  for (const seg of segments) {
    if (seg.pm25 !== null && totalEI > 0) {
      const segEI = seg.pm25 * (seg.durationSeconds / 60);
      seg.contributionPercent = Number(((segEI / totalEI) * 100).toFixed(1));
    }
  }

  // Ambil 3 segmen dengan kontribusi paparan terbesar
  const topContributors = [...segments]
    .filter((s) => s.pm25 !== null && s.contributionPercent !== null)
    .sort((a, b) => (b.contributionPercent || 0) - (a.contributionPercent || 0))
    .slice(0, 3);

  // 6. Penentuan Confidence Level
  let confidenceLevel: ConfidenceLevel = 'low';
  const hasExpired = maxAge !== null && maxAge > 24 * 60;
  const isAllFresh = maxAge !== null && maxAge <= 3 * 60;
  const nearbyStationRatio = nearbyStationsDurationMin / totalDurationMin;

  if (coverageRatio >= 0.8 && nearbyStationRatio >= 0.5 && isAllFresh) {
    confidenceLevel = 'high';
  } else if (coverageRatio >= 0.5 && !hasExpired) {
    confidenceLevel = 'medium';
  }

  return {
    exposureIndexPm25: totalEI,
    avgPm25,
    category: pm25ToCategory(avgPm25),
    coverageRatio,
    confidenceLevel,
    maxDataAgeMinutes: maxAge,
    isPartiallyImputed,
    segments,
    topContributors,
    stationsUsed: Array.from(stationsMap.values()),
  };
}

/**
 * Alias kompatibilitas transisi untuk backward compatibility dengan kode lama.
 */
export function calculateRouteExposure(
  route: RouteCandidate,
  stations: StationData[]
): RouteExposureEstimate {
  return computeRouteExposure({
    route,
    stations,
    params: DEFAULT_ALGORITHM_PARAMS,
  });
}
