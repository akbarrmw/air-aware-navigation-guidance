import { RouteCandidate } from '@/types/routing';
import { StationData } from '@/types/air-quality';
import { OptimizationPreference, AnalyzeRoutesResponseData } from '@/types/algorithms';
import { calculateRouteExposure } from '@/lib/algorithms/exposure';
import { scoreAndRankRoutes } from '@/lib/algorithms/scoring';
import { generateRecommendations } from '@/lib/algorithms/recommendation';
import { getRouteAlternatives } from './routingService';
import { getAirQualityStations, AirQualityBounds } from './airQualityService';
import { isPointWithinPilotArea } from './geocodingService';
import { ECOPULSE_PARAMS } from '@/config/parameters';

export interface AnalyzePipelineInput {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  preferences: OptimizationPreference;
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

  // Margin ~10 km sekitar rute (0.09 derajat)
  const margin = (ECOPULSE_PARAMS.PAR_02_SEARCH_RADIUS_KM / 111.0);

  return {
    south: Number((minLat - margin).toFixed(4)),
    west: Number((minLng - margin).toFixed(4)),
    north: Number((maxLat + margin).toFixed(4)),
    east: Number((maxLng + margin).toFixed(4)),
  };
}

/**
 * Pipeline Integrator: Menggabungkan Rute + Stasiun + Algoritma Evaluasi
 * Pemilik: Person 2 (Backend Services)
 */
export async function runAnalysisPipeline(
  input: AnalyzePipelineInput
): Promise<AnalyzeRoutesResponseData> {
  const isSimulation = process.env.DATA_MODE === 'simulation';
  const warnings: string[] = [];

  // 1. Cek cakupan area pilot
  const originInArea = isPointWithinPilotArea(input.origin.lat, input.origin.lng);
  const destInArea = isPointWithinPilotArea(input.destination.lat, input.destination.lng);

  if (!originInArea || !destInArea) {
    warnings.push('OUTSIDE_COVERAGE: Rute melintasi luar batas kota pilot. Estimasi polusi mungkin terbatas atau tidak tersedia.');
  }

  // 2. Dapatkan alternatif rute (Live OSRM atau mock)
  const candidateRoutes = input.routes || (await getRouteAlternatives(input.origin, input.destination));

  // 3. Dapatkan data stasiun udara di sekitar koridor rute
  let stations = input.stations;
  if (!stations) {
    const routeBbox = calculateRoutesBBox(candidateRoutes);
    stations = await getAirQualityStations(routeBbox);
  }

  // 4. Hitung estimasi paparan tiap rute menggunakan ALG-01 (Person 1)
  const routesWithEstimates = candidateRoutes.map((route) => {
    const estimate = calculateRouteExposure(route, stations!);
    return {
      candidate: route,
      estimate,
    };
  });

  // 5. Lakukan skoring multi-kriteria dan Pareto ranking menggunakan ALG-03 (Person 1)
  const rankingResult = scoreAndRankRoutes(routesWithEstimates, input.preferences);

  // 6. Cari rute rekomendasi dan rute tercepat untuk membuat action recommendations ALG-04
  const recommendedItem = rankingResult.routes.find(
    (r) => r.label === rankingResult.recommendedRouteLabel
  ) || rankingResult.routes[0];

  const fastestItem = rankingResult.routes.find((r) => r.isFastest) || rankingResult.routes[0];

  const actionMessages = generateRecommendations(
    recommendedItem.estimate,
    fastestItem.estimate,
    recommendedItem.durationSeconds / 60
  );

  // 7. Tambahkan peringatan simulasi jika aktif
  if (isSimulation) {
    warnings.unshift('SIMULATION_DATA: Mode simulasi aktif. Menampilkan data contoh rute & polusi offline.');
  }

  return {
    routes: rankingResult.routes,
    recommendedRouteLabel: rankingResult.recommendedRouteLabel,
    recommendationExplanation: rankingResult.recommendationExplanation,
    actionMessages,
    warnings,
    disclaimer: 'Estimasi indikator paparan lingkungan berdasarkan durasi dan konsentrasi interpolasi; bukan dosis inhalasi klinis perorangan.',
  };
}
