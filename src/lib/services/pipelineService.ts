/**
 * @file pipelineService.ts
 * @description Integrator pipeline analisis rute dan polusi udara.
 * Menggabungkan kandidat rute riil (OSRM), data stasiun (WAQI & Open-Meteo), dan algoritma evaluasi untuk menghasilkan AnalyzeRoutesResponseData.
 * 
 * @author Person 2 (Backend & External APIs) & Person 1 (Core Integration)
 * @module lib/services/pipelineService
 * @see CODE_SPEC_AANG.md Bagian 7.1 & Bagian 11 (Gate G1 & G2)
 */

import { MOCK_STATIONS } from '@/fixtures/mockStations';
import type { RouteCandidate } from '@/types/routing';
import type { StationData } from '@/types/air-quality';
import type { RoutePreferences } from '@/types/preferences';
import type { AnalyzeRoutesResponseData, DataSourceInfo } from '@/types/analyze';
import type { ApiWarning } from '@/types/api';
import { computeRouteExposure } from '@/lib/algorithms/exposure';
import { decideRoutes } from '@/lib/algorithms/scoring';
import { getRouteAlternatives } from './routingService';
import { getAirQualityStations, AirQualityBounds } from './airQualityService';
import { isPointWithinPilotArea, isPointWithinIndonesia } from './geocodingService';
import { DEFAULT_ALGORITHM_PARAMS } from '@/config/parameters';

export interface AnalyzePipelineInput {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  waypoints?: Array<{ lat: number; lng: number; label?: string }>;
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

const PRODUCTION_DISCLAIMER =
  'Indikator paparan polusi dihitung sebagai estimasi komparatif perjalanan dan bukan merupakan takaran klinis medis.';

const PRODUCTION_ALGORITHM_VERSION = '1.0.0-prod';

/**
 * Pipeline Integrator: Menggabungkan Rute + Stasiun + Algoritma Evaluasi.
 * Pemilik: Person 2 (Backend Services)
 */
export async function runAnalysisPipeline(
  input: AnalyzePipelineInput
): Promise<AnalyzeRoutesResponseData> {
  const warnings: ApiWarning[] = [];

  // 1. Cek cakupan area (Seluruh Indonesia)
  const originInArea = isPointWithinPilotArea(input.origin.lat, input.origin.lng) || isPointWithinIndonesia(input.origin.lat, input.origin.lng);
  const destInArea = isPointWithinPilotArea(input.destination.lat, input.destination.lng) || isPointWithinIndonesia(input.destination.lat, input.destination.lng);

  if (!originInArea || !destInArea) {
    warnings.push({
      code: 'OUTSIDE_COVERAGE',
      message: 'Rute melintasi luar batas wilayah Indonesia. Estimasi polusi mungkin terbatas atau tidak tersedia.',
    });
  }

  // 2. Dapatkan alternatif rute riil (OSRM Live dengan titik asal, waypoints, & tujuan sebenarnya)
  const candidateRoutes =
    input.routes ||
    (await getRouteAlternatives(input.origin, input.destination, input.waypoints));

  // 3. Dapatkan data stasiun udara di sekitar koridor rute sebenarnya
  let stations = input.stations;
  let isUsingMockStations = false;

  if (!stations || stations.length === 0) {
    try {
      const routeBbox = calculateRoutesBBox(candidateRoutes);
      stations = await getAirQualityStations(routeBbox);
    } catch (err) {
      console.warn('[PipelineService] Gagal fetch live air stations, fallback to stations cache/mock:', err);
    }

    if (!stations || stations.length === 0) {
      stations = MOCK_STATIONS;
      isUsingMockStations = true;
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

  // 6. Bentuk atribusi sumber data riil secara transparan
  const hasLiveObservation = stations?.some((s) => s.dataType === 'station_observation');
  const hasModelFallback = stations?.some((s) => s.dataType === 'model_fallback');

  const dataSources: DataSourceInfo[] = [
    {
      sourceName: hasLiveObservation
        ? 'WAQI (World Air Quality Index) Observasi Sensor'
        : 'Open-Meteo Air Quality Model',
      dataType: hasLiveObservation
        ? 'station_observation'
        : hasModelFallback
        ? 'model_fallback'
        : isUsingMockStations
        ? 'simulation'
        : 'station_observation',
      attributionText: hasLiveObservation
        ? 'Data kualitas udara PM2.5 real-time berbasis stasiun observasi fisik resmi'
        : 'Data kualitas udara estimasi model atmosfer numerik CAMS / Open-Meteo',
      observedRange: {
        oldest: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        newest: new Date().toISOString(),
      },
    },
    {
      sourceName: 'OpenStreetMap & Project OSRM',
      dataType: 'station_observation',
      attributionText: '© OpenStreetMap contributors, data geometri jalan dan routing navigasi OSRM',
    },
  ];

  if (isUsingMockStations) {
    warnings.unshift({
      code: 'SIMULATION_DATA',
      message: 'Jaringan stasiun pemantau live tidak terjangkau. Menggunakan data estimasi cadangan.',
    });
  }

  return {
    ...decision,
    dataSources,
    warnings,
    disclaimer: PRODUCTION_DISCLAIMER,
    algorithmVersion: PRODUCTION_ALGORITHM_VERSION,
  };
}
