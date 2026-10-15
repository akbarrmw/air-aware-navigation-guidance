/**
 * @file exposure.ts
 * @description Modul estimasi paparan polusi akumulatif sepanjang rute navigasi (ALG-01).
 * Mengintegrasikan konsentrasi PM2.5 tiap segmen terinterpolasi terhadap waktu tempuh rute.
 * 
 * @author Person 1 (Core Algorithm & System Integration)
 * @module lib/algorithms/exposure
 * @see CODE_SPEC_AANG.md Bagian 3.8 & Bagian 6 (ALG-01, FR-05, FR-09, TC-01, TC-04)
 */

import type { StationData } from '@/types/air-quality';
import type { RouteCandidate } from '@/types/routing';
import type {
  RouteExposureEstimate,
  AlgorithmParams,
  SegmentExposure,
  StationUsed,
} from '@/types/algorithms';
import { DEFAULT_ALGORITHM_PARAMS } from '@/config/parameters';
import { pm25ToCategory } from './aqiConversion';
import { splitPath } from './segmentation';
import { pathLengthMeters } from './geoMath';
import { idwAtPoint } from './interpolation';
import { determineConfidenceLevel } from './confidence';

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
 * Tahapan kalkulasi:
 * 1. Pemotongan rute menjadi segmen diskrit per PAR-01 (default 500m).
 * 2. Asumsi kecepatan homogen: durasi segmen Δt_i = T × (L_i / L_total).
 * 3. Interpolasi IDW PM2.5 pada titik tengah setiap segmen (ALG-02).
 * 4. Perhitungan rasio cakupan: jika coverage < PAR-08 (20%), set EI = null, confidence = 'unavailable' (TC-04).
 * 5. Perhitungan konsentrasi rata-rata terbobot waktu (avgPm25) pada segmen berdata.
 * 6. Imputasi segmen yang tidak memiliki stasiun dengan avgPm25 (isPartiallyImputed = true).
 * 7. Akumulasi Exposure Index: EI = Σ (PM2.5_segmen × Δt_segmen_menit).
 * 8. Identifikasi top 3 segmen kontributor polusi tertinggi.
 * 9. Evaluasi Confidence Level (High, Medium, Low, Unavailable) (TC-07).
 * 
 * @param input Objek parameter input rute, stasiun pemantau, konfigurasi params, dan waktu observasi
 * @returns RouteExposureEstimate lengkap
 */
export function computeRouteExposure(input: ComputeRouteExposureInput): RouteExposureEstimate {
  const { route, stations } = input;
  const params = input.params ?? DEFAULT_ALGORITHM_PARAMS;
  const coords = route.geometry.coordinates;
  const totalDurationMin = route.durationSeconds / 60;
  const totalDistanceM = pathLengthMeters(coords) || route.distanceMeters;

  // Kasus rute tidak valid atau berjarak/durasi 0
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

  // 1. Pemotongan rute menjadi segmen diskrit per PAR-01 (500m)
  const pathSegments = splitPath(coords, params.segmentLengthMeters);
  const segments: SegmentExposure[] = [];
  const stationsMap = new Map<string, StationUsed>();

  let validDataDurationMin = 0;
  let maxAge: number | null = null;
  let hasExpiredData = false;
  let hasModelFallback = false;
  let nearbyStationsDurationMin = 0;

  // 2. Evaluasi interpolasi IDW untuk setiap segmen
  for (let i = 0; i < pathSegments.length; i++) {
    const seg = pathSegments[i];
    // Asumsi kecepatan homogen: Δt_i = T * (L_i / L_total)
    const segDurationSec = (seg.lengthMeters / totalDistanceM) * route.durationSeconds;
    const midPoint =
      seg.coordinates[Math.floor(seg.coordinates.length / 2)] || seg.coordinates[0];

    const idwRes = idwAtPoint(midPoint, stations, params);

    if (idwRes.pm25 !== null) {
      validDataDurationMin += segDurationSec / 60;

      for (const st of idwRes.stationsUsed) {
        if (!stationsMap.has(st.stationId)) {
          stationsMap.set(st.stationId, st);
        }
        if (st.ageMinutes !== null) {
          maxAge = maxAge === null ? st.ageMinutes : Math.max(maxAge, st.ageMinutes);
        }
        if (st.freshness === 'expired') {
          hasExpiredData = true;
        }
        if (st.dataType === 'model_fallback') {
          hasModelFallback = true;
        }
      }

      if (idwRes.nearestDistanceMeters !== null && idwRes.nearestDistanceMeters <= params.nearDistanceMeters) {
        nearbyStationsDurationMin += segDurationSec / 60;
      }
    }

    segments.push({
      segmentIndex: i,
      startKm: Number((seg.startDistanceMeters / 1000).toFixed(2)),
      endKm: Number((seg.endDistanceMeters / 1000).toFixed(2)),
      path: seg.coordinates,
      durationSeconds: Math.round(segDurationSec),
      pm25: idwRes.pm25,
      category: pm25ToCategory(idwRes.pm25),
      uncertaintyClass: idwRes.uncertaintyClass,
      contributionPercent: null,
    });
  }

  // 3. Rasio cakupan segmen berdata
  const coverageRatio = Number((validDataDurationMin / totalDurationMin).toFixed(2));

  // Jika cakupan di bawah PAR-08 (20%), estimasi dianggap tidak valid (TC-04)
  if (coverageRatio < params.minCoverageRatio) {
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

  // 4. Hitung rata-rata konsentrasi segmen berdata: avgPm25 = Σ (C_i * Δt_i) / Σ Δt_i
  let sumWeightedPm25 = 0;
  for (const seg of segments) {
    if (seg.pm25 !== null) {
      sumWeightedPm25 += seg.pm25 * (seg.durationSeconds / 60);
    }
  }

  const avgKnownPm25 = validDataDurationMin > 0 ? sumWeightedPm25 / validDataDurationMin : 0;
  let isPartiallyImputed = false;

  // Imputasi segmen yang tidak memiliki stasiun dengan avgKnownPm25
  for (const seg of segments) {
    if (seg.pm25 === null) {
      isPartiallyImputed = true;
      seg.pm25 = Number(avgKnownPm25.toFixed(1));
      seg.category = pm25ToCategory(seg.pm25);
    }
  }

  // 5. Akumulasi Exposure Index (EI) total rute: Σ (PM2.5_segmen × durasi_menit)
  let totalEI = 0;
  for (const seg of segments) {
    const segEI = (seg.pm25 || 0) * (seg.durationSeconds / 60);
    totalEI += segEI;
  }
  totalEI = Number(totalEI.toFixed(1));
  const avgPm25 = Number((totalEI / totalDurationMin).toFixed(1));

  // 6. Hitung persentase kontribusi per segmen terhadap total EI
  for (const seg of segments) {
    if (seg.pm25 !== null && totalEI > 0) {
      const segEI = seg.pm25 * (seg.durationSeconds / 60);
      seg.contributionPercent = Number(((segEI / totalEI) * 100).toFixed(1));
    }
  }

  // 7. Ambil maksimal 3 segmen dengan kontribusi paparan terbesar (hotspots)
  const topContributors = [...segments]
    .filter((s) => s.pm25 !== null && s.contributionPercent !== null)
    .sort((a, b) => (b.contributionPercent || 0) - (a.contributionPercent || 0))
    .slice(0, 3);

  // 8. Evaluasi tingkat keyakinan (Confidence Level) via modul confidence
  const confidenceLevel = determineConfidenceLevel(
    {
      coverageRatio,
      nearbyStationDurationRatio: nearbyStationsDurationMin / totalDurationMin,
      maxDataAgeMinutes: maxAge,
      hasExpiredData,
      hasModelFallback,
    },
    params
  );

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
