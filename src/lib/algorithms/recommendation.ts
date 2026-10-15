import { RouteExposureEstimate, RecommendationMessage } from '@/types/algorithms';
import { ECOPULSE_PARAMS } from '@/config/parameters';

/**
 * ALG-04: Aturan Rekomendasi Berbasis Aturan (RULE-01 s/d RULE-07)
 * Seluruh pesan bersifat non-klinis dan tidak memuat klaim dosis inhalasi individual.
 */
export function generateRecommendations(
  recommendedEstimate: RouteExposureEstimate,
  fastestEstimate: RouteExposureEstimate,
  durationMinutes: number
): RecommendationMessage[] {
  const messages: RecommendationMessage[] = [];

  // RULE-07: Estimasi tidak tersedia
  if (recommendedEstimate.exposureIndexPm25 === null) {
    return [
      {
        ruleId: 'RULE-07',
        severity: 'info',
        message: 'Data kualitas udara tidak mencukupi untuk rute ini. Rute dipilih berdasarkan waktu tempuh.',
        basis: 'Cakupan stasiun < 20% atau data kedaluwarsa.',
      },
    ];
  }

  // RULE-01: Kategori Baik
  if (recommendedEstimate.category === 'good') {
    messages.push({
      ruleId: 'RULE-01',
      severity: 'info',
      message: 'Estimasi kualitas udara sepanjang rute tergolong Baik. Tidak diperlukan tindakan pencegahan khusus.',
      basis: 'Konsentrasi rata-rata PM2.5 berada pada batas aman.',
    });
  }

  // RULE-02: Kategori Sedang
  if (recommendedEstimate.category === 'moderate') {
    messages.push({
      ruleId: 'RULE-02',
      severity: 'info',
      message: 'Kualitas udara Sedang. Individu yang sangat sensitif disarankan mempertimbangkan pembatasan aktivitas luar ruang berat.',
      basis: 'Konsentrasi PM2.5 berkisar antara 12.1–35.4 µg/m³.',
    });
  }

  // RULE-03: Kategori di atas Sedang
  if (
    recommendedEstimate.category === 'unhealthySensitive' ||
    recommendedEstimate.category === 'unhealthy' ||
    recommendedEstimate.category === 'veryUnhealthy' ||
    recommendedEstimate.category === 'hazardous'
  ) {
    messages.push({
      ruleId: 'RULE-03',
      severity: 'warning',
      message: 'Paparan polusi tergolong tinggi. Pertimbangkan menggunakan masker pelindung partikel atau menutup sirkulasi ventilasi luar kendaraan.',
      basis: `Kategori rute: ${recommendedEstimate.category}.`,
    });
  }

  // RULE-04: Durasi panjang (>= 45 menit) pada kualitas udara Sedang atau lebih
  if (
    durationMinutes >= ECOPULSE_PARAMS.PAR_14_LONG_TRIP_MINUTES &&
    recommendedEstimate.category !== 'good'
  ) {
    messages.push({
      ruleId: 'RULE-04',
      severity: 'warning',
      message: 'Perjalanan berdurasi panjang dapat meningkatkan akumulasi paparan partikel polusi lingkungan.',
      basis: `Durasi perjalanan ${Math.round(durationMinutes)} menit (≥ 45 menit).`,
    });
  }

  // RULE-05: Penurunan EI >= 10% dengan tambahan waktu <= 10 menit
  if (
    fastestEstimate.exposureIndexPm25 !== null &&
    recommendedEstimate.exposureIndexPm25 < fastestEstimate.exposureIndexPm25
  ) {
    const reductionPct =
      ((fastestEstimate.exposureIndexPm25 - recommendedEstimate.exposureIndexPm25) /
        fastestEstimate.exposureIndexPm25) *
      100;
    if (reductionPct >= 10) {
      messages.push({
        ruleId: 'RULE-05',
        severity: 'info',
        message: `Rute pilihan berhasil menurunkan estimasi akumulasi paparan hingga ${Math.round(
          reductionPct
        )}% dibanding rute tercepat.`,
        basis: 'Trade-off waktu vs reduksi polusi terverifikasi efektif.',
      });
    }
  }

  // RULE-06: Keyakinan Rendah atau data agak lama (stale)
  if (recommendedEstimate.confidenceLevel === 'low') {
    messages.push({
      ruleId: 'RULE-06',
      severity: 'info',
      message: 'Tingkat keyakinan estimasi rendah karena keterbatasan sebaran stasiun. Gunakan angka sebagai gambaran kasar.',
      basis: 'Jarak stasiun pengamat relatif jauh dari koridor rute.',
    });
  }

  // Maksimal 3 pesan rekomendasi berprioritas
  return messages.slice(0, 3);
}
