/**
 * @file pipelineService.ts
 * @description Integrator pipeline analisis rute dan polusi udara.
 * Menggabungkan kandidat rute, data stasiun, dan algoritma evaluasi untuk menghasilkan AnalyzeRoutesResponseData.
 * 
 * @author Person 2 (Backend & External APIs)
 * @module lib/services/pipelineService
 * @see CODE_SPEC_AANG.md Bagian 7.1 & Bagian 11 (Gate G1 & G2)
 */

import { MOCK_ROUTES } from '@/fixtures/mockRoutes';
import { MOCK_STATIONS } from '@/fixtures/mockStations';
import { MOCK_DATA_SOURCES, MOCK_DISCLAIMER, MOCK_ALGORITHM_VERSION } from '@/fixtures/mockAnalysis';
import type { RouteCandidate } from '@/types/routing';
import type { StationData } from '@/types/air-quality';
import type { RoutePreferences } from '@/types/preferences';
import type { AnalyzeRoutesResponseData } from '@/types/analyze';
import type { ApiWarning } from '@/types/api';
import { computeRouteExposure } from '@/lib/algorithms/exposure';
import { decideRoutes } from '@/lib/algorithms/scoring';
import { getRouteAlternatives } from './routingService';
import { getAirQualityStations, AirQualityBounds } from './airQualityService';
import { isPointWithinPilotArea } from './geocodingService';
import { DEFAULT_ALGORITHM_PARAMS } from '@/config/parameters';

export interface AnalyzePipelineInput {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  preferences: RoutePreferences;
  routes?: RouteCandidate[];
  stations?: StationData[];
}

/**
 * Menghitung bounding box dari serangkaian rute kandidat ditambah margin radius
 */
function calculateRoutesBBox(routes: RouteCandidate[]): AirQualityBounds {
  let minLat = Infinity;
  let minLng = Infinity;
  let maxLat = -Infinity;
  let maxLng = -Infinity;

  for (const route of routes) {
    for (const [lat, lng] of route.geometry.coordinates) {
      if (lat < minLat) minLat = lat;
      if (lng < minLng) minLng = lng;
      if (lat > maxLat) maxLat = lat;
      if (lng > maxLng) maxLng = lng;
    }
  }

  // Margin radius pencarian stasiun (10 km = ~0.09 derajat)
  const margin = (DEFAULT_ALGORITHM_PARAMS.stationRadiusMeters / 111000);

  return {
    south: Number((minLat - margin).toFixed(4)),
    west: Number((minLng - margin).toFixed(4)),
    north: Number((maxLat + margin).toFixed(4)),
    east: Number((maxLng + margin).toFixed(4)),
  };
}

/**
 * Pipeline Integrator: Menggabungkan Rute + Stasiun + Algoritma Evaluasi.
 * Pemilik: Person 2 (Backend Services)
 */
export async function runAnalysisPipeline(
  input: AnalyzePipelineInput
): Promise<AnalyzeRoutesResponseData> {
  const isSimulation = process.env.DATA_MODE === 'simulation';
  const warnings: ApiWarning[] = [];

  // 1. Cek cakupan area pilot
  const originInArea = isPointWithinPilotArea(input.origin.lat, input.origin.lng);
  const destInArea = isPointWithinPilotArea(input.destination.lat, input.destination.lng);

  if (!originInArea || !destInArea) {
    warnings.push({
      code: 'OUTSIDE_COVERAGE',
      message: 'Rute melintasi luar batas kota pilot. Estimasi polusi mungkin terbatas atau tidak tersedia.',
    });
  }

  // 2. Dapatkan alternatif rute (Live OSRM atau mock)
  const candidateRoutes =
    input.routes ||
    (isSimulation
      ? MOCK_ROUTES
      : await getRouteAlternatives(input.origin, input.destination));

  // 3. Dapatkan data stasiun udara di sekitar koridor rute
  let stations = input.stations;
  if (!stations) {
    if (isSimulation) {
      stations = MOCK_STATIONS;
    } else {
      const routeBbox = calculateRoutesBBox(candidateRoutes);
      stations = await getAirQualityStations(routeBbox);
    }
  }

  // 4. Hitung estimasi paparan tiap rute menggunakan ALG-01 (Person 1)
  const routesWithEstimates = candidateRoutes.map((route) => ({
    ...route,
    estimate: computeRouteExposure({ route, stations: stations! }),
  }));

  // 5. Lakukan skoring multi-kriteria dan Pareto ranking menggunakan ALG-03 (Person 1)
  const decision = decideRoutes({
    routes: routesWithEstimates,
    preferences: input.preferences,
  });

  // 6. Tambahkan peringatan simulasi jika aktif
  if (isSimulation) {
    warnings.unshift({
      code: 'SIMULATION_DATA',
      message: 'Mode simulasi aktif. Menampilkan data contoh rute & polusi offline.',
    });
  }

  return {
    ...decision,
    dataSources: MOCK_DATA_SOURCES,
    warnings,
    disclaimer: MOCK_DISCLAIMER,
    algorithmVersion: MOCK_ALGORITHM_VERSION,
  };
}
