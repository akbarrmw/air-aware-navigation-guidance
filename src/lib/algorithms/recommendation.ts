/**
 * Mesin aturan anjuran aksi dan saran mitigasi kesehatan non-klinis.
 */

import type {
  ActionMessage,
  RecommendationContext,
  RouteExposureEstimate,
} from '@/types/algorithms';
import { DEFAULT_ALGORITHM_PARAMS } from '@/config/parameters';

/**
 * Urutan bobot prioritas severity untuk pengurutan pesan (angka lebih kecil = prioritas lebih tinggi).
 */
const SEVERITY_PRIORITY: Record<ActionMessage['severity'], number> = {
  warning: 0,
  attention: 1,
  info: 2,
};

/**
 * Mengevaluasi aturan rekomendasi tindakan proteksi kesehatan berdasarkan estimasi paparan rute.
 */
export function evaluateRecommendations(ctx: RecommendationContext): ActionMessage[] {
  const { recommendedRoute, fastestRoute } = ctx;
  const messages: ActionMessage[] = [];

  // Jika tidak ada rute terpilih atau estimasi paparan bernilai null (RULE-07)
  if (!recommendedRoute || recommendedRoute.estimate.exposureIndexPm25 === null) {
    return [
      {
        ruleId: 'RULE-07',
        severity: 'info',
        message: 'Data kualitas udara tidak mencukupi untuk koridor ini. Rute diarahkan murni berdasarkan waktu tempuh.',
        basis: 'Cakupan stasiun < 20% atau sensor stasiun di sekitar rute tidak aktif.',
      },
    ];
  }

  const recEstimate = recommendedRoute.estimate;
  const fastestEstimate = fastestRoute.estimate;
  const durationMinutes = recommendedRoute.durationSeconds / 60;

  // RULE-01: Kategori Baik (PM2.5 <= 12 µg/m³)
  if (recEstimate.category === 'good') {
    messages.push({
      ruleId: 'RULE-01',
      severity: 'info',
      message: 'Estimasi kualitas udara sepanjang rute tergolong Baik. Kondisi ideal untuk mobilitas aktif.',
      basis: 'Konsentrasi rata-rata PM2.5 berada pada rentang batas aman (≤ 12 µg/m³).',
    });
  }

  // RULE-02: Kategori Sedang (12.1 - 35.4 µg/m³)
  if (recEstimate.category === 'moderate') {
    messages.push({
      ruleId: 'RULE-02',
      severity: 'info',
      message: 'Kualitas udara Sedang. Kelompok sensitif dapat mempertimbangkan pembatasan durasi aktivitas fisik di luar ruang.',
      basis: 'Konsentrasi rata-rata PM2.5 berada pada rentang 12.1–35.4 µg/m³.',
    });
  }

  // RULE-03: Kategori Tidak Sehat bagi Sensitif atau lebih buruk (> 35.4 µg/m³)
  if (
    recEstimate.category === 'unhealthySensitive' ||
    recEstimate.category === 'unhealthy' ||
    recEstimate.category === 'veryUnhealthy' ||
    recEstimate.category === 'hazardous'
  ) {
    messages.push({
      ruleId: 'RULE-03',
      severity: 'warning',
      message: 'Indikator polusi rute cukup tinggi. Pertimbangkan penggunaan masker pelindung partikel atau menutup ventilasi udara luar kendaraan.',
      basis: `Kategori rute terpilih: ${recEstimate.category} (rata-rata PM2.5: ${recEstimate.avgPm25 ?? '-'} µg/m³).`,
    });
  }

  // RULE-04: Durasi perjalanan panjang (>= 45 menit) pada udara Sedang atau lebih
  if (
    durationMinutes >= DEFAULT_ALGORITHM_PARAMS.longTripMinutes &&
    recEstimate.category !== 'good'
  ) {
    messages.push({
      ruleId: 'RULE-04',
      severity: 'attention',
      message: 'Perjalanan berdurasi panjang dapat meningkatkan akumulasi paparan terhadap partikulat udara.',
      basis: `Estimasi durasi tempuh ${Math.round(durationMinutes)} menit (≥ 45 menit batas perjalanan panjang).`,
    });
  }

  // RULE-05: Penurunan EI signifikan (>= 10%) dibanding rute tercepat
  if (
    fastestEstimate.exposureIndexPm25 !== null &&
    recEstimate.exposureIndexPm25 !== null &&
    fastestEstimate.exposureIndexPm25 > 0 &&
    recEstimate.exposureIndexPm25 < fastestEstimate.exposureIndexPm25
  ) {
    const reductionPct =
      ((fastestEstimate.exposureIndexPm25 - recEstimate.exposureIndexPm25) /
        fastestEstimate.exposureIndexPm25) *
      100;

    if (reductionPct >= 10) {
      messages.push({
        ruleId: 'RULE-05',
        severity: 'info',
        message: `Rute pilihan berhasil menurunkan indikator paparan sekitar ${Math.round(
          reductionPct
        )}% dibandingkan rute tercepat.`,
        basis: 'Trade-off waktu perjalanan terhadap penurunan paparan polusi terverifikasi menguntungkan.',
      });
    }
  }

  // RULE-06: Tingkat keyakinan estimasi rendah (Low Confidence)
  if (recEstimate.confidenceLevel === 'low') {
    messages.push({
      ruleId: 'RULE-06',
      severity: 'attention',
      message: 'Tingkat keyakinan estimasi tergolong rendah karena keterbatasan sebaran stasiun pemantau. Gunakan angka sebagai referensi relatif.',
      basis: 'Jarak stasiun pengamat relatif jauh atau sebagian data segmen diimputasi.',
    });
  }

  // Urutkan berdasarkan prioritas severity (warning -> attention -> info)
  messages.sort((a, b) => SEVERITY_PRIORITY[a.severity] - SEVERITY_PRIORITY[b.severity]);

  // Ambil maksimal 3 pesan teratas sesuai spesifikasi PRD
  return messages.slice(0, 3);
}

/**
 * Menghasilkan rekomendasi tindakan proteksi kesehatan untuk estimasi rute.
 */
export function generateRecommendations(
  recommendedEstimate: RouteExposureEstimate,
  fastestEstimate: RouteExposureEstimate,
  durationMinutes: number
): ActionMessage[] {
  // Bentuk mock minimal context
  const mockRoute = {
    id: 'rec',
    label: 'A' as const,
    distanceMeters: 1000,
    durationSeconds: Math.round(durationMinutes * 60),
    geometry: { coordinates: [] },
    isFastest: true,
    estimate: recommendedEstimate,
    comparison: { extraSeconds: 0, extraPercent: 0, exposureDeltaPercent: 0 },
    withinTimeLimit: true,
    isDominated: false,
    score: 0,
  };

  const mockFastest = {
    ...mockRoute,
    id: 'fastest',
    estimate: fastestEstimate,
  };

  return evaluateRecommendations({
    recommendedRoute: mockRoute,
    fastestRoute: mockFastest,
    allRoutes: [mockRoute],
    now: new Date().toISOString(),
  });
}
