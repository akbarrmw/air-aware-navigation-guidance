/**
 * @file pipelineService.ts
 * @description Integrator pipeline analisis rute dan polusi udara (Stub Gate G0).
 * Menggabungkan kandidat rute, data stasiun, dan algoritma evaluasi untuk menghasilkan AnalyzeRoutesResponseData.
 * 
 * @author Person 2 (Backend & External APIs) / Stub by Person 1
 * @module lib/services/pipelineService
 * @see CODE_SPEC_AANG.md Bagian 7.1 & Bagian 11 (Gate G0)
 */

import { MOCK_ROUTES } from '@/fixtures/mockRoutes';
import { MOCK_STATIONS } from '@/fixtures/mockStations';
import { MOCK_DATA_SOURCES, MOCK_DISCLAIMER, MOCK_ALGORITHM_VERSION } from '@/fixtures/mockAnalysis';
import type { RouteCandidate } from '@/types/routing';
import type { StationData } from '@/types/air-quality';
import type { RoutePreferences } from '@/types/preferences';
import type { AnalyzeRoutesResponseData } from '@/types/analyze';
import { computeRouteExposure } from '@/lib/algorithms/exposure';
import { decideRoutes } from '@/lib/algorithms/scoring';

export interface AnalyzePipelineInput {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  preferences: RoutePreferences;
  routes?: RouteCandidate[];
  stations?: StationData[];
}

/**
 * Pipeline Integrator: Menggabungkan Rute + Stasiun + Algoritma Evaluasi.
 * Pada Gate G0, mengembalikan fixture valid `AnalyzeRoutesResponseData` yang siap dikonsumsi UI (P4) dan API (P2).
 */
export async function runAnalysisPipeline(
  input: AnalyzePipelineInput
): Promise<AnalyzeRoutesResponseData> {
  const isSimulation = process.env.DATA_MODE === 'simulation';

  // 1. Ambil kandidat rute (live service atau mock)
  const candidateRoutes = input.routes || MOCK_ROUTES;

  // 2. Ambil data stasiun (live service atau mock)
  const stations = input.stations || MOCK_STATIONS;

  // 3. Evaluasi paparan tiap rute
  const routesWithEstimates = candidateRoutes.map((route) => ({
    ...route,
    estimate: computeRouteExposure({ route, stations }),
  }));

  // 4. Pengambilan keputusan dan ranking Pareto
  const decision = decideRoutes({
    routes: routesWithEstimates,
    preferences: input.preferences,
  });

  return {
    ...decision,
    dataSources: MOCK_DATA_SOURCES,
    warnings: isSimulation
      ? [{ code: 'SIMULATION_DATA', message: 'Menggunakan data simulasi stasiun & rute (Mode Simulasi Aktif).' }]
      : [],
    disclaimer: MOCK_DISCLAIMER,
    algorithmVersion: MOCK_ALGORITHM_VERSION,
  };
}
