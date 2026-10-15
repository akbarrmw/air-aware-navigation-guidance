/**
 * @file scoring.ts
 * @description Modul skoring multi-kriteria, eliminasi Pareto-dominated rute, dan pemilihan rekomendasi rute (ALG-03).
 * @author Person 1 (Core Algorithm & System Integration)
 * @module lib/algorithms/scoring
 * @see CODE_SPEC_AANG.md Bagian 3.8 & Bagian 6 (ALG-03, FR-06, FR-07, FR-08)
 */

import type { RouteCandidate } from '@/types/routing';
import type { RoutePreferences } from '@/types/preferences';
import type {
  RouteExposureEstimate,
  AnalyzedRoute,
  DecisionResult,
  AlgorithmParams,
  ExplanationInfo,
  ActionMessage,
} from '@/types/algorithms';
import { DEFAULT_ALGORITHM_PARAMS } from '@/config/parameters';
import { generateRecommendations } from './recommendation';

export interface DecideRoutesInput {
  routes: Array<RouteCandidate & { estimate: RouteExposureEstimate }>;
  preferences: RoutePreferences;
  params?: AlgorithmParams;
  now?: string;
}

/**
 * ALG-03: Menghitung metrik komparasi, mengecek dominasi Pareto, menghitung skor gabungan,
 * dan menentukan rute yang direkomendasikan beserta penjelasannya.
 * 
 * @param input Parameter input rute ber-estimasi, preferensi, dan parameter algoritma
 * @returns DecisionResult lengkap (AnalyzedRoute[], recommendedRouteLabel, explanation, actionMessages)
 */
export function decideRoutes(input: DecideRoutesInput): DecisionResult {
  const { routes, preferences } = input;
  const params = input.params ?? DEFAULT_ALGORITHM_PARAMS;

  if (routes.length === 0) {
    return {
      routes: [],
      recommendedRouteLabel: null,
      explanation: {
        reasonCode: 'SINGLE_ROUTE',
        text: 'Tidak ada alternatif rute yang tersedia.',
        extraMinutes: null,
        extraPercent: null,
        exposureDeltaPercent: null,
        isSignificant: false,
      },
      actionMessages: [],
    };
  }

  // 1. Temukan rute tercepat (baseline)
  const fastestRoute =
    routes.find((r) => r.isFastest) ||
    [...routes].sort((a, b) => a.durationSeconds - b.durationSeconds)[0];

  const fastestDuration = fastestRoute.durationSeconds;
  const fastestEI = fastestRoute.estimate.exposureIndexPm25;

  // Kasus hanya 1 rute
  if (routes.length === 1) {
    const onlyRoute = routes[0];
    const analyzedOnly: AnalyzedRoute = {
      ...onlyRoute,
      comparison: {
        extraSeconds: 0,
        extraPercent: 0,
        exposureDeltaPercent: 0,
      },
      withinTimeLimit: true,
      isDominated: false,
      score: 0,
    };

    return {
      routes: [analyzedOnly],
      recommendedRouteLabel: onlyRoute.label,
      explanation: {
        reasonCode: 'SINGLE_ROUTE',
        text: 'Hanya tersedia satu opsi rute navigasi menuju tujuan yang dipilih.',
        extraMinutes: 0,
        extraPercent: 0,
        exposureDeltaPercent: 0,
        isSignificant: false,
      },
      actionMessages: generateRecommendations(
        analyzedOnly.estimate,
        analyzedOnly.estimate,
        analyzedOnly.durationSeconds / 60
      ),
    };
  }

  // 2. Evaluasi metrik komparatif untuk setiap rute
  const analyzedRoutes: AnalyzedRoute[] = routes.map((r) => {
    const extraSeconds = Math.max(0, r.durationSeconds - fastestDuration);
    const extraPercent = Number(((extraSeconds / fastestDuration) * 100).toFixed(1));

    let exposureDeltaPercent: number | null = null;
    if (r.estimate.exposureIndexPm25 !== null && fastestEI !== null && fastestEI > 0) {
      exposureDeltaPercent = Number(
        (((r.estimate.exposureIndexPm25 - fastestEI) / fastestEI) * 100).toFixed(1)
      );
    }

    // Cek batas toleransi waktu preferensi pengguna
    const withinTimeLimit =
      preferences.maxExtraTimePercent === null ||
      extraPercent <= preferences.maxExtraTimePercent;

    return {
      ...r,
      comparison: {
        extraSeconds,
        extraPercent,
        exposureDeltaPercent,
      },
      withinTimeLimit,
      isDominated: false,
      score: null,
    };
  });

  // 3. Deteksi Dominasi Pareto
  // Suatu rute A didominasi jika ada rute B yang:
  // durasi B <= durasi A DAN paparan B <= paparan A (dengan salah satu strictly better)
  for (const rA of analyzedRoutes) {
    for (const rB of analyzedRoutes) {
      if (rA.id === rB.id) continue;

      const timeB_better = rB.durationSeconds <= rA.durationSeconds;
      const eiA = rA.estimate.exposureIndexPm25;
      const eiB = rB.estimate.exposureIndexPm25;

      if (eiA !== null && eiB !== null) {
        const eiB_better = eiB <= eiA;
        const strictlyBetter = rB.durationSeconds < rA.durationSeconds || eiB < eiA;

        if (timeB_better && eiB_better && strictlyBetter) {
          rA.isDominated = true;
          break;
        }
      }
    }
  }

  // 4. Kalkulasi Skor Multi-Kriteria
  // S = w_time * T_norm + w_exp * E_norm
  const wExp = preferences.exposureWeight;
  const wTime = 1 - wExp;

  const validEIs = analyzedRoutes
    .map((r) => r.estimate.exposureIndexPm25)
    .filter((ei): ei is number => ei !== null);

  const maxDuration = Math.max(...analyzedRoutes.map((r) => r.durationSeconds));
  const minDuration = fastestDuration;
  const maxEI = validEIs.length > 0 ? Math.max(...validEIs) : null;
  const minEI = validEIs.length > 0 ? Math.min(...validEIs) : null;

  for (const r of analyzedRoutes) {
    const normTime =
      maxDuration > minDuration
        ? (r.durationSeconds - minDuration) / (maxDuration - minDuration)
        : 0;

    let normEI = 0;
    if (r.estimate.exposureIndexPm25 !== null && maxEI !== null && minEI !== null) {
      normEI = maxEI > minEI ? (r.estimate.exposureIndexPm25 - minEI) / (maxEI - minEI) : 0;
      r.score = Number((wTime * normTime + wExp * normEI).toFixed(3));
    } else {
      // Jika tidak ada data EI, skor murni berbasis waktu
      r.score = Number(normTime.toFixed(3));
    }
  }

  // 5. Pemilihan Rute Rekomendasi
  // Filter rute yang memenuhi batas waktu dan tidak terdominasi
  const eligibleRoutes = analyzedRoutes.filter(
    (r) => r.withinTimeLimit && !r.isDominated
  );

  let chosenRoute: AnalyzedRoute;

  if (eligibleRoutes.length > 0) {
    // Pilih rute dengan skor terendah
    eligibleRoutes.sort((a, b) => (a.score ?? 999) - (b.score ?? 999));
    chosenRoute = eligibleRoutes[0];
  } else {
    // Fallback ke rute tercepat jika seluruh alternatif di luar limit
    chosenRoute =
      analyzedRoutes.find((r) => r.isFastest) || analyzedRoutes[0];
  }

  // 6. Perakitan Informasi Penjelasan (ExplanationInfo)
  let explanation: ExplanationInfo;

  if (validEIs.length === 0) {
    explanation = {
      reasonCode: 'NO_ESTIMATE',
      text: 'Data kualitas udara tidak tersedia di sepanjang rute. Rekomendasi murni diarahkan berdasarkan waktu tercepat.',
      extraMinutes: null,
      extraPercent: null,
      exposureDeltaPercent: null,
      isSignificant: false,
    };
  } else if (chosenRoute.isFastest) {
    explanation = {
      reasonCode: 'FASTEST_IS_BEST',
      text: 'Rute tercepat direkomendasikan karena memberikan efisiensi waktu terbaik tanpa peningkatan risiko polusi yang berarti.',
      extraMinutes: 0,
      extraPercent: 0,
      exposureDeltaPercent: 0,
      isSignificant: false,
    };
  } else {
    const extraMin = Math.round(chosenRoute.comparison.extraSeconds / 60);
    const expDelta = chosenRoute.comparison.exposureDeltaPercent;
    const isSignificant =
      expDelta !== null &&
      Math.abs(expDelta) >= params.significanceThresholdPercent;

    if (expDelta !== null && expDelta < 0 && isSignificant) {
      explanation = {
        reasonCode: 'BETTER_EXPOSURE',
        text: `Rute ${chosenRoute.label} direkomendasikan karena menghemat paparan polusi sebesar ${Math.abs(
          expDelta
        )}% dengan tambahan waktu ${extraMin} menit (${chosenRoute.comparison.extraPercent}%).`,
        extraMinutes: extraMin,
        extraPercent: chosenRoute.comparison.extraPercent,
        exposureDeltaPercent: expDelta,
        isSignificant: true,
      };
    } else {
      explanation = {
        reasonCode: 'DIFFERENCE_NOT_SIGNIFICANT',
        text: `Perbedaan paparan polusi tidak signifikan (< 5%). Rute ${chosenRoute.label} dipilih sesuai toleransi preferensi Anda.`,
        extraMinutes: extraMin,
        extraPercent: chosenRoute.comparison.extraPercent,
        exposureDeltaPercent: expDelta,
        isSignificant: false,
      };
    }
  }

  // 7. Pesan Tindakan / Rekomendasi Mitigasi
  const fastestAnalyzed =
    analyzedRoutes.find((r) => r.isFastest) || analyzedRoutes[0];
  const actionMessages: ActionMessage[] = generateRecommendations(
    chosenRoute.estimate,
    fastestAnalyzed.estimate,
    chosenRoute.durationSeconds / 60
  );

  return {
    routes: analyzedRoutes,
    recommendedRouteLabel: validEIs.length === 0 ? null : chosenRoute.label,
    explanation,
    actionMessages,
  };
}

/**
 * Alias kompatibilitas transisi untuk backward compatibility dengan kode lama (pipelineService).
 */
export function scoreAndRankRoutes(
  routesWithEstimates: Array<{ candidate: RouteCandidate; estimate: RouteExposureEstimate }>,
  preferences: RoutePreferences
) {
  const merged = routesWithEstimates.map((item) => ({
    ...item.candidate,
    estimate: item.estimate,
  }));

  const decision = decideRoutes({
    routes: merged,
    preferences,
  });

  return {
    routes: decision.routes.map((r) => ({
      ...r,
      timeDiffVsFastestMin: Math.round(r.comparison.extraSeconds / 60),
      timeDiffPercent: r.comparison.extraPercent,
      eiDiffPercentVsFastest: r.comparison.exposureDeltaPercent,
    })),
    recommendedRouteLabel: decision.recommendedRouteLabel || 'A',
    recommendationExplanation: decision.explanation.text,
  };
}
