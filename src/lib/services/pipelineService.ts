import { MOCK_ROUTES } from '@/fixtures/mockRoutes';
import { MOCK_STATIONS } from '@/fixtures/mockStations';
import { RouteCandidate } from '@/types/routing';
import { StationData } from '@/types/air-quality';
import { OptimizationPreference, AnalyzeRoutesResponseData } from '@/types/algorithms';
import { calculateRouteExposure } from '@/lib/algorithms/exposure';
import { scoreAndRankRoutes } from '@/lib/algorithms/scoring';
import { generateRecommendations } from '@/lib/algorithms/recommendation';

export interface AnalyzePipelineInput {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  preferences: OptimizationPreference;
  routes?: RouteCandidate[];
  stations?: StationData[];
}

/**
 * Pipeline Integrator: Menggabungkan Rute + Stasiun + Algoritma Evaluasi
 */
export async function runAnalysisPipeline(
  input: AnalyzePipelineInput
): Promise<AnalyzeRoutesResponseData> {
  const isSimulation = process.env.DATA_MODE === 'simulation';

  // 1. Dapatkan alternatif rute (dari live service atau mock)
  const candidateRoutes = input.routes || (isSimulation ? MOCK_ROUTES : MOCK_ROUTES);

  // 2. Dapatkan data stasiun (dari live service atau mock)
  const stations = input.stations || (isSimulation ? MOCK_STATIONS : MOCK_STATIONS);

  // 3. Hitung estimasi paparan tiap rute menggunakan ALG-01 (Person 1)
  const routesWithEstimates = candidateRoutes.map((route) => {
    const estimate = calculateRouteExposure(route, stations);
    return {
      candidate: route,
      estimate,
    };
  });

  // 4. Lakukan skoring multi-kriteria dan Pareto ranking menggunakan ALG-03 (Person 1)
  const rankingResult = scoreAndRankRoutes(routesWithEstimates, input.preferences);

  // 5. Cari rute tercepat dan rute terpilih untuk membuat rekomendasi tindakan ALG-04
  const recommendedItem = rankingResult.routes.find(
    (r) => r.label === rankingResult.recommendedRouteLabel
  )!;
  const fastestItem = rankingResult.routes.find((r) => r.isFastest)!;

  const actionMessages = generateRecommendations(
    recommendedItem.estimate,
    fastestItem.estimate,
    recommendedItem.durationSeconds / 60
  );

  return {
    routes: rankingResult.routes,
    recommendedRouteLabel: rankingResult.recommendedRouteLabel,
    recommendationExplanation: rankingResult.recommendationExplanation,
    actionMessages,
    warnings: isSimulation ? ['Menggunakan data simulasi stasiun & rute (Mode Simulasi Aktif).'] : [],
    disclaimer: 'Estimasi indikator paparan lingkungan berdasarkan durasi dan konsentrasi interpolasi; bukan dosis inhalasi klinis perorangan.',
  };
}
