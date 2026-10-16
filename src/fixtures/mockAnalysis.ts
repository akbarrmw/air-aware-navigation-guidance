/**
 * Data fixture respons analisis rute navigasi.
 */

import type {
  AnalyzeRoutesResponseData,
  AnalyzedRoute,
  StationUsed,
  SegmentExposure,
  DataSourceInfo,
} from '@/types';

// ==========================================
// 1. Data Sumber dan Disclaimer Bersama
// ==========================================

export const MOCK_DATA_SOURCES: DataSourceInfo[] = [
  {
    sourceName: 'WAQI Semarang (Simpang Lima & Undip)',
    dataType: 'simulation',
    attributionText: 'Data kualitas udara simulasi berbasis stasiun resmi WAQI & BMKG Jawa Tengah',
    observedRange: {
      oldest: '2026-10-15T12:00:00Z',
      newest: '2026-10-15T13:00:00Z',
    },
  },
  {
    sourceName: 'OpenStreetMap & OSRM',
    dataType: 'simulation',
    attributionText: '© OpenStreetMap contributors, data rute OSRM',
  },
];

export const MOCK_DISCLAIMER =
  'Indikator paparan polusi dihitung sebagai estimasi komparatif perjalanan dan bukan merupakan takaran klinis medis.';

export const MOCK_ALGORITHM_VERSION = '1.0.0-aang-gate0';

// ==========================================
// 2. Stasiun Pemantau Fixture
// ==========================================

const mockStationUndip: StationUsed = {
  stationId: 'st-01',
  stationName: 'Stasiun BMKG Tembalang (Undip)',
  distanceMeters: 450,
  pm25: 18.5,
  ageMinutes: 35,
  freshness: 'fresh',
  dataType: 'simulation',
};

const mockStationGombel: StationUsed = {
  stationId: 'st-02',
  stationName: 'Stasiun Pemantau Bukit Gombel',
  distanceMeters: 1200,
  pm25: 28.0,
  ageMinutes: 45,
  freshness: 'fresh',
  dataType: 'simulation',
};

const mockStationSimpangLima: StationUsed = {
  stationId: 'st-03',
  stationName: 'Stasiun Pusat Kota Simpang Lima',
  distanceMeters: 800,
  pm25: 46.2,
  ageMinutes: 20,
  freshness: 'fresh',
  dataType: 'simulation',
};

// ==========================================
// 3. Segmen-segmen Lintasan Fixture
// ==========================================

const createMockSegments = (
  coords: [number, number][],
  basePm25: number,
  durationSec: number
): SegmentExposure[] => {
  const segmentDuration = durationSec / Math.max(1, coords.length - 1);
  const segments: SegmentExposure[] = [];

  for (let i = 0; i < coords.length - 1; i++) {
    const factor = 1 + (i % 2 === 0 ? 0.15 : -0.1);
    const pm25Val = Math.round(basePm25 * factor * 10) / 10;
    const cat = pm25Val <= 12 ? 'good' : pm25Val <= 35.4 ? 'moderate' : 'unhealthySensitive';

    segments.push({
      segmentIndex: i,
      startKm: i * 2.5,
      endKm: (i + 1) * 2.5,
      path: [coords[i], coords[i + 1]],
      durationSeconds: Math.round(segmentDuration),
      pm25: pm25Val,
      category: cat,
      uncertaintyClass: 'near',
      contributionPercent: Math.round(100 / (coords.length - 1)),
    });
  }

  return segments;
};

// ==========================================
// 4. Skenario 1: Normal (A, B, C)
// Rute A = Tercepat (20 mnt), Rute B = Lebih Bersih (+3 mnt, -28% EI) -> Direkomendasikan
// ==========================================

const routeA_Coords: [number, number][] = [
  [-7.0514, 110.4388], // Tembalang
  [-7.0350, 110.4320], // Jatingaleh
  [-7.0150, 110.4280], // Peterongan
  [-6.9928, 110.4222], // Simpang Lima
];

const routeB_Coords: [number, number][] = [
  [-7.0514, 110.4388], // Tembalang
  [-7.0420, 110.4200], // Jalur Bukit Sari
  [-7.0200, 110.4150], // Lempongsari Asri
  [-6.9928, 110.4222], // Simpang Lima
];

const routeC_Coords: [number, number][] = [
  [-7.0514, 110.4388], // Tembalang
  [-7.0500, 110.4500], // Kedungmundu
  [-7.0100, 110.4450], // Majapahit
  [-6.9928, 110.4222], // Simpang Lima
];

const routeA_Segments = createMockSegments(routeA_Coords, 42.0, 1200);
const routeB_Segments = createMockSegments(routeB_Coords, 26.5, 1380);
const routeC_Segments = createMockSegments(routeC_Coords, 38.0, 1620);

export const MOCK_ANALYZED_ROUTE_A: AnalyzedRoute = {
  id: 'route-0',
  label: 'A',
  isFastest: true,
  distanceMeters: 8500,
  durationSeconds: 1200, // 20 menit
  geometry: { coordinates: routeA_Coords },
  estimate: {
    exposureIndexPm25: 840, // 42 µg/m³ * 20 menit
    avgPm25: 42.0,
    category: 'unhealthySensitive',
    coverageRatio: 1.0,
    confidenceLevel: 'high',
    maxDataAgeMinutes: 45,
    isPartiallyImputed: false,
    segments: routeA_Segments,
    topContributors: routeA_Segments.slice(0, 3),
    stationsUsed: [mockStationUndip, mockStationGombel, mockStationSimpangLima],
  },
  comparison: {
    extraSeconds: 0,
    extraPercent: 0,
    exposureDeltaPercent: 0,
  },
  withinTimeLimit: true,
  isDominated: false,
  score: 0.65,
};

export const MOCK_ANALYZED_ROUTE_B: AnalyzedRoute = {
  id: 'route-1',
  label: 'B',
  isFastest: false,
  distanceMeters: 9200,
  durationSeconds: 1380, // 23 menit (+3 menit = +15%)
  geometry: { coordinates: routeB_Coords },
  estimate: {
    exposureIndexPm25: 609.5, // 26.5 µg/m³ * 23 menit (-27.4% exposure)
    avgPm25: 26.5,
    category: 'moderate',
    coverageRatio: 1.0,
    confidenceLevel: 'high',
    maxDataAgeMinutes: 45,
    isPartiallyImputed: false,
    segments: routeB_Segments,
    topContributors: routeB_Segments.slice(0, 3),
    stationsUsed: [mockStationUndip, mockStationGombel, mockStationSimpangLima],
  },
  comparison: {
    extraSeconds: 180,
    extraPercent: 15.0,
    exposureDeltaPercent: -27.4,
  },
  withinTimeLimit: true,
  isDominated: false,
  score: 0.42, // Skor lebih baik
};

export const MOCK_ANALYZED_ROUTE_C: AnalyzedRoute = {
  id: 'route-2',
  label: 'C',
  isFastest: false,
  distanceMeters: 10400,
  durationSeconds: 1620, // 27 menit (+7 menit = +35%)
  geometry: { coordinates: routeC_Coords },
  estimate: {
    exposureIndexPm25: 1026,
    avgPm25: 38.0,
    category: 'unhealthySensitive',
    coverageRatio: 1.0,
    confidenceLevel: 'medium',
    maxDataAgeMinutes: 45,
    isPartiallyImputed: false,
    segments: routeC_Segments,
    topContributors: routeC_Segments.slice(0, 3),
    stationsUsed: [mockStationUndip, mockStationSimpangLima],
  },
  comparison: {
    extraSeconds: 420,
    extraPercent: 35.0,
    exposureDeltaPercent: +22.1,
  },
  withinTimeLimit: false, // Melebihi default maxExtraTimePercent (30%)
  isDominated: true,      // Lebih lambat dan polusi lebih tinggi dibanding B
  score: 0.88,
};

/** Skenario 1: Respons Analisis Rute Normal (Lengkap & Ideal) */
export const MOCK_ANALYSIS_NORMAL: AnalyzeRoutesResponseData = {
  routes: [MOCK_ANALYZED_ROUTE_A, MOCK_ANALYZED_ROUTE_B, MOCK_ANALYZED_ROUTE_C],
  recommendedRouteLabel: 'B',
  explanation: {
    reasonCode: 'BETTER_EXPOSURE',
    text: 'Rute B direkomendasikan karena menghemat paparan polusi sebesar 27% dengan tambahan waktu hanya 3 menit.',
    extraMinutes: 3,
    extraPercent: 15.0,
    exposureDeltaPercent: -27.4,
    isSignificant: true,
  },
  actionMessages: [
    {
      ruleId: 'RULE-01',
      severity: 'info',
      message: 'Rute alternatif B memiliki udara berkategori Sedang, lebih sehat dibanding rute utama.',
      basis: 'Kategori rute terpilih adalah Sedang vs rute tercepat Tidak Sehat bagi Sensitif.',
    },
    {
      ruleId: 'RULE-05',
      severity: 'info',
      message: 'Tutup kaca jendela kendaraan saat melintasi segmen jalan protokol Peterongan.',
      basis: 'Segmen 2 memiliki konsentrasi polusi puncak 48.5 µg/m³.',
    },
  ],
  dataSources: MOCK_DATA_SOURCES,
  warnings: [],
  disclaimer: MOCK_DISCLAIMER,
  algorithmVersion: MOCK_ALGORITHM_VERSION,
};

// ==========================================
// 5. Skenario 2: Hanya Satu Rute Tersedia (SINGLE_ROUTE_ONLY)
// ==========================================

export const MOCK_ANALYSIS_SINGLE_ROUTE: AnalyzeRoutesResponseData = {
  routes: [MOCK_ANALYZED_ROUTE_A],
  recommendedRouteLabel: 'A',
  explanation: {
    reasonCode: 'SINGLE_ROUTE',
    text: 'Hanya tersedia satu opsi rute navigasi menuju tujuan yang dipilih.',
    extraMinutes: 0,
    extraPercent: 0,
    exposureDeltaPercent: 0,
    isSignificant: false,
  },
  actionMessages: [
    {
      ruleId: 'RULE-01',
      severity: 'attention',
      message: 'Tidak ada alternatif jalur lain. Gunakan masker saat berkendara roda dua.',
      basis: 'Hanya satu rute tersedia dengan AQI Tidak Sehat bagi Sensitif.',
    },
  ],
  dataSources: MOCK_DATA_SOURCES,
  warnings: [
    {
      code: 'SINGLE_ROUTE_ONLY',
      message: 'Layanan navigasi hanya menemukan 1 rute fisik menuju lokasi tujuan.',
    },
  ],
  disclaimer: MOCK_DISCLAIMER,
  algorithmVersion: MOCK_ALGORITHM_VERSION,
};

// ==========================================
// 6. Skenario 3: Data Polusi Tidak Tersedia (AIR_DATA_UNAVAILABLE)
// ==========================================

const routeA_NoData: AnalyzedRoute = {
  ...MOCK_ANALYZED_ROUTE_A,
  estimate: {
    exposureIndexPm25: null,
    avgPm25: null,
    category: null,
    coverageRatio: 0.0,
    confidenceLevel: 'unavailable',
    maxDataAgeMinutes: null,
    isPartiallyImputed: false,
    segments: [],
    topContributors: [],
    stationsUsed: [],
  },
  comparison: {
    extraSeconds: 0,
    extraPercent: 0,
    exposureDeltaPercent: null,
  },
  score: null,
};

export const MOCK_ANALYSIS_UNAVAILABLE: AnalyzeRoutesResponseData = {
  routes: [routeA_NoData],
  recommendedRouteLabel: null, // Sesuai spesifikasi: null bila polusi tidak tersedia
  explanation: {
    reasonCode: 'NO_ESTIMATE',
    text: 'Data kualitas udara tidak tersedia di sepanjang rute perjalanan. Navigasi diarahkan murni berdasarkan waktu tempuh.',
    extraMinutes: null,
    extraPercent: null,
    exposureDeltaPercent: null,
    isSignificant: false,
  },
  actionMessages: [],
  dataSources: [],
  warnings: [
    {
      code: 'AIR_DATA_UNAVAILABLE',
      message: 'Tidak ada sensor stasiun pemantau yang aktif di sekitar koridor rute ini.',
    },
  ],
  disclaimer: MOCK_DISCLAIMER,
  algorithmVersion: MOCK_ALGORITHM_VERSION,
};

// ==========================================
// 7. Skenario 4: Rute Terdominasi Pareto
// Alternatif rute lebih lama DAN polusi lebih buruk -> Rute tercepat adalah yang terbaik
// ==========================================

export const MOCK_ANALYSIS_DOMINATED: AnalyzeRoutesResponseData = {
  routes: [
    MOCK_ANALYZED_ROUTE_A,
    {
      ...MOCK_ANALYZED_ROUTE_B,
      estimate: {
        ...MOCK_ANALYZED_ROUTE_B.estimate,
        exposureIndexPm25: 950, // Polusi lebih buruk dari A
        avgPm25: 47.5,
      },
      comparison: {
        extraSeconds: 180,
        extraPercent: 15.0,
        exposureDeltaPercent: +13.1, // Polusi +13% lebih buruk
      },
      isDominated: true,
      score: 0.79,
    },
  ],
  recommendedRouteLabel: 'A',
  explanation: {
    reasonCode: 'FASTEST_IS_BEST',
    text: 'Rute tercepat A direkomendasikan karena rute alternatif membutuhkan waktu lebih lama dengan paparan polusi yang tidak lebih baik.',
    extraMinutes: 0,
    extraPercent: 0,
    exposureDeltaPercent: 0,
    isSignificant: false,
  },
  actionMessages: [],
  dataSources: MOCK_DATA_SOURCES,
  warnings: [],
  disclaimer: MOCK_DISCLAIMER,
  algorithmVersion: MOCK_ALGORITHM_VERSION,
};

// ==========================================
// 8. Skenario 5: Titik di Luar Cakupan Pilot Area
// ==========================================

export const MOCK_ANALYSIS_OUTSIDE_COVERAGE: AnalyzeRoutesResponseData = {
  ...MOCK_ANALYSIS_UNAVAILABLE,
  warnings: [
    {
      code: 'OUTSIDE_COVERAGE',
      message: 'Titik koordinat perjalanan berada di luar area pilot pemantauan udara Kota Semarang.',
    },
  ],
};

// ==========================================
// 9. Skenario 6: Data Stasiun Stale (> 3 Jam)
// ==========================================

export const MOCK_ANALYSIS_STALE: AnalyzeRoutesResponseData = {
  ...MOCK_ANALYSIS_NORMAL,
  warnings: [
    {
      code: 'STATION_DATA_STALE',
      message: 'Data observasi stasiun terakhir diperbarui lebih dari 3 jam yang lalu.',
    },
  ],
};

/**
 * Fixture default yang diekspor untuk kemudahan integrasi.
 */
export const mockAnalysis = MOCK_ANALYSIS_NORMAL;
export default MOCK_ANALYSIS_NORMAL;
