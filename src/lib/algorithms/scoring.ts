import { RouteAnalysisItem, OptimizationPreference } from '@/types/algorithms';
import { RouteCandidate } from '@/types/routing';
import { RouteExposureEstimate } from '@/types/algorithms';
import { ECOPULSE_PARAMS } from '@/config/parameters';

export interface RouteScoringResult {
  routes: RouteAnalysisItem[];
  recommendedRouteLabel: 'A' | 'B' | 'C';
  recommendationExplanation: string;
}

/**
 * ALG-03: Perbandingan Rute, Penandaan Pareto, dan Pemilihan Rekomendasi
 */
export function scoreAndRankRoutes(
  candidates: { candidate: RouteCandidate; estimate: RouteExposureEstimate }[],
  preferences: OptimizationPreference
): RouteScoringResult {
  if (candidates.length === 0) {
    throw new Error('Tidak ada rute untuk dianalisis.');
  }

  const fastest = candidates.reduce((prev, curr) =>
    curr.candidate.durationSeconds < prev.candidate.durationSeconds ? curr : prev
  );

  const tMin = fastest.candidate.durationSeconds;
  const validEiEstimates = candidates
    .map((c) => c.estimate.exposureIndexPm25)
    .filter((ei): ei is number => ei !== null);

  const eMin = validEiEstimates.length > 0 ? Math.min(...validEiEstimates) : null;
  const we = Math.max(0, Math.min(1, preferences.exposureWeight));
  const maxExtraPct = preferences.maxExtraTimePercent ?? Infinity;

  // Siapkan daftar item analisis
  const scoredRoutes: (RouteAnalysisItem & { score: number; eligible: boolean })[] = candidates.map((item) => {
    const dur = item.candidate.durationSeconds;
    const ei = item.estimate.exposureIndexPm25;

    const timeDiffVsFastestMin = Number(((dur - tMin) / 60).toFixed(1));
    const timeDiffPercent = Number((((dur - tMin) / tMin) * 100).toFixed(1));
    const eiDiffPercentVsFastest =
      ei !== null && fastest.estimate.exposureIndexPm25 !== null && fastest.estimate.exposureIndexPm25 > 0
        ? Number((((ei - fastest.estimate.exposureIndexPm25) / fastest.estimate.exposureIndexPm25) * 100).toFixed(1))
        : null;

    // Cek batas toleransi waktu
    const isWithinTimeBudget = timeDiffPercent <= maxExtraPct;

    // Normalisasi rasio Tn dan En
    const tn = dur / tMin;
    const en = eMin !== null && ei !== null && eMin > 0 ? ei / eMin : 1;

    // Skor gabungan: (1 - we) * Tn + we * En
    const score = (1 - we) * tn + we * en;

    return {
      ...item.candidate,
      estimate: item.estimate,
      timeDiffVsFastestMin,
      timeDiffPercent,
      eiDiffPercentVsFastest,
      score,
      eligible: isWithinTimeBudget,
    };
  });

  // Pareto Domination Check:
  // Suatu rute terdominasi jika ada rute lain dengan waktu <= dan EI <= dan minimal salah satu lebih kecil
  for (const r1 of scoredRoutes) {
    if (r1.estimate.exposureIndexPm25 === null) continue;
    for (const r2 of scoredRoutes) {
      if (r2.id === r1.id || r2.estimate.exposureIndexPm25 === null) continue;
      const t1 = r1.durationSeconds;
      const t2 = r2.durationSeconds;
      const e1 = r1.estimate.exposureIndexPm25;
      const e2 = r2.estimate.exposureIndexPm25;

      if (t2 <= t1 && e2 <= e1 && (t2 < t1 || e2 < e1)) {
        r1.estimate.isDominated = true;
        break;
      }
    }
  }

  // Pilih rute dengan skor terendah dari yang eligible (memenuhi batas waktu)
  const eligibleRoutes = scoredRoutes.filter((r) => r.eligible);
  const candidatesForBest = eligibleRoutes.length > 0 ? eligibleRoutes : scoredRoutes;

  // Urutkan berdasarkan skor
  candidatesForBest.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    // Jika seri, pilih EI lebih rendah
    const eiA = a.estimate.exposureIndexPm25 ?? Infinity;
    const eiB = b.estimate.exposureIndexPm25 ?? Infinity;
    if (eiA !== eiB) return eiA - eiB;
    return a.durationSeconds - b.durationSeconds;
  });

  let best = candidatesForBest[0];

  // Ambang batas signifikansi (PAR-07: 5%)
  // Jika rute terpilih bukan rute tercepat, tetapi penurunan EI < 5%, kembalikan ke tercepat
  let explanation = '';
  if (
    best.id !== fastest.candidate.id &&
    best.estimate.exposureIndexPm25 !== null &&
    fastest.estimate.exposureIndexPm25 !== null
  ) {
    const eiReductionPct =
      ((fastest.estimate.exposureIndexPm25 - best.estimate.exposureIndexPm25) /
        fastest.estimate.exposureIndexPm25) *
      100;

    if (eiReductionPct < ECOPULSE_PARAMS.PAR_07_SIGNIFICANCE_THRESHOLD * 100) {
      best = scoredRoutes.find((r) => r.id === fastest.candidate.id)!;
      explanation = `Rute ${best.label} (tercepat) direkomendasikan karena selisih penurunan polusi rute alternatif kurang dari 5% (tidak signifikan).`;
    } else {
      explanation = `Rute ${best.label} direkomendasikan: Menghemat estimasi paparan polusi ${Math.abs(
        best.eiDiffPercentVsFastest!
      )}% dengan tambahan waktu ${best.timeDiffVsFastestMin} menit (+${best.timeDiffPercent}%).`;
    }
  } else if (best.id === fastest.candidate.id) {
    if (best.estimate.exposureIndexPm25 === null) {
      explanation = `Rute ${best.label} direkomendasikan berdasarkan waktu tempuh tercepat (data kualitas udara tidak memadai).`;
    } else {
      explanation = `Rute ${best.label} merupakan rute tercepat dengan estimasi paparan paling optimal.`;
    }
  }

  return {
    routes: scoredRoutes.map(({ score, eligible, ...rest }) => rest),
    recommendedRouteLabel: best.label,
    recommendationExplanation: explanation,
  };
}
