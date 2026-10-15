/**
 * @file decide.ts
 * @description Modul isomorfik pengambil keputusan rekomendasi rute navigasi (ALG-03).
 * Dapat dijalankan di sisi server (/api/routes/analyze) maupun di peramban klien (P4)
 * saat pengguna menggeser slider preferensi tanpa perlu melakukan fetch jaringan ulang.
 * 
 * @author Person 1 (Core Algorithm & System Integration)
 * @module lib/algorithms/decide
 * @see CODE_SPEC_AANG.md Bagian 3.8 & Bagian 6 (ALG-03, FR-06, FR-07, FR-08, TC-08, TC-09, TC-10)
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
import { evaluateRecommendations } from './recommendation';

/**
 * Parameter input untuk fungsi pengambilan keputusan rute isomorfik.
 */
export interface DecideRoutesInput {
  /** Daftar kandidat rute yang telah memiliki estimasi paparan polusi */
  routes: Array<RouteCandidate & { estimate: RouteExposureEstimate }>;
  /** Preferensi bobot paparan dan toleransi waktu tambahan pengguna */
  preferences: RoutePreferences;
  /** Parameter numerik algoritma (opsional, default: DEFAULT_ALGORITHM_PARAMS) */
  params?: AlgorithmParams;
  /** Waktu saat analisis dieksekusi (ISO UTC string) */
  now?: string;
}

/**
 * ALG-03: Menentukan rute yang direkomendasikan secara multi-kriteria berbasis trade-off waktu vs polusi.
 * 
 * Tahapan logika:
 * 1. Temukan rute tercepat sebagai titik referensi (baseline).
 * 2. Hitung metrik komparasi (extraSeconds, extraPercent, exposureDeltaPercent).
 * 3. Evaluasi batas toleransi waktu pengguna (withinTimeLimit).
 * 4. Deteksi dominasi Pareto (rute yang waktu dan polusinya terbukti inferior).
 * 5. Normalisasi nilai durasi dan polusi, lalu hitung skor gabungan terbobot:
 *    S_r = (1 - w_exp) * T_norm + w_exp * E_norm
 * 6. Evaluasi ambang batas signifikansi 5% (PAR-07):
 *    Jika reduksi polusi rute alternatif < 5% dibanding rute tercepat,
 *    rekomendasi dikembalikan ke rute tercepat (alasan: DIFFERENCE_NOT_SIGNIFICANT) (TC-10).
 * 7. Rakit penjelasan transparan (ExplanationInfo) dan pesan mitigasi kesehatan (ActionMessage[]).
 * 
 * @param input Objek DecideRoutesInput
 * @returns DecisionResult lengkap (routes, recommendedRouteLabel, explanation, actionMessages)
 */
export function decideRoutes(input: DecideRoutesInput): DecisionResult {
  const { routes, preferences } = input;
  const params = input.params ?? DEFAULT_ALGORITHM_PARAMS;
  const now = input.now ?? new Date().toISOString();

  // Kasus tidak ada rute
  if (routes.length === 0) {
    return {
      routes: [],
      recommendedRouteLabel: null,
      explanation: {
        reasonCode: 'SINGLE_ROUTE',
        text: 'Tidak ada alternatif rute yang tersedia untuk dianalisis.',
        extraMinutes: null,
        extraPercent: null,
        exposureDeltaPercent: null,
        isSignificant: false,
      },
      actionMessages: [],
    };
  }

  // 1. Temukan rute tercepat (baseline rute navigasi konvensional)
  const fastestRoute =
    routes.find((r) => r.isFastest) ||
    [...routes].sort((a, b) => a.durationSeconds - b.durationSeconds)[0];

  const fastestDuration = fastestRoute.durationSeconds;
  const fastestEI = fastestRoute.estimate.exposureIndexPm25;

  // Kasus hanya ada 1 rute tunggal (TC-26b)
  if (routes.length === 1) {
    const single = routes[0];
    const analyzedSingle: AnalyzedRoute = {
      ...single,
      comparison: {
        extraSeconds: 0,
        extraPercent: 0,
        exposureDeltaPercent: 0,
      },
      withinTimeLimit: true,
      isDominated: false,
      score: 0,
    };

    const actionMessages = evaluateRecommendations({
      recommendedRoute: analyzedSingle,
      fastestRoute: analyzedSingle,
      allRoutes: [analyzedSingle],
      now,
    });

    return {
      routes: [analyzedSingle],
      recommendedRouteLabel: single.label,
      explanation: {
        reasonCode: 'SINGLE_ROUTE',
        text: 'Hanya tersedia satu opsi rute navigasi fisik menuju tujuan yang dipilih.',
        extraMinutes: 0,
        extraPercent: 0,
        exposureDeltaPercent: 0,
        isSignificant: false,
      },
      actionMessages,
    };
  }

  // 2. Evaluasi metrik komparasi tiap rute terhadap rute tercepat
  const analyzedRoutes: AnalyzedRoute[] = routes.map((r) => {
    const extraSeconds = Math.max(0, r.durationSeconds - fastestDuration);
    const extraPercent = Number(
      ((extraSeconds / Math.max(1, fastestDuration)) * 100).toFixed(1)
    );

    let exposureDeltaPercent: number | null = null;
    if (r.estimate.exposureIndexPm25 !== null && fastestEI !== null && fastestEI > 0) {
      exposureDeltaPercent = Number(
        (((r.estimate.exposureIndexPm25 - fastestEI) / fastestEI) * 100).toFixed(1)
      );
    }

    // Periksa batas toleransi waktu pengguna (null = tanpa batas) (TC-09)
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
  // Suatu rute A didominasi jika ada rute B yang durasinya <= A DAN polusinya <= A
  // dengan salah satu nilai strictly better (<).
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

  // 4. Kalkulasi Skor Multi-Kriteria (Normalisasi Rasio sesuai PRD)
  // Tn_r = T_r / T_min dan En_r = E_r / E_min
  // S_r = (1 - w_e) * Tn_r + w_e * En_r (Skor terendah menang)
  const wExp = Math.max(0, Math.min(1, preferences.exposureWeight));
  const wTime = 1 - wExp;

  const validEIs = analyzedRoutes
    .map((r) => r.estimate.exposureIndexPm25)
    .filter((ei): ei is number => ei !== null);

  const minDuration = Math.max(1, fastestDuration);
  const minEI = validEIs.length > 0 ? Math.min(...validEIs) : null;

  for (const r of analyzedRoutes) {
    const normTime = r.durationSeconds / minDuration;

    let normEI = 1.0;
    if (r.estimate.exposureIndexPm25 !== null && minEI !== null && minEI > 0) {
      normEI = r.estimate.exposureIndexPm25 / minEI;
      r.score = Number((wTime * normTime + wExp * normEI).toFixed(4));
    } else {
      // Jika data polusi tidak tersedia, skor murni berbasis rasio waktu
      r.score = Number(normTime.toFixed(4));
    }
  }

  // Kasus: seluruh estimasi polusi tidak tersedia
  if (validEIs.length === 0) {
    const fastestAnalyzed =
      analyzedRoutes.find((r) => r.isFastest) || analyzedRoutes[0];

    const actionMessages = evaluateRecommendations({
      recommendedRoute: fastestAnalyzed,
      fastestRoute: fastestAnalyzed,
      allRoutes: analyzedRoutes,
      now,
    });

    return {
      routes: analyzedRoutes,
      recommendedRouteLabel: null, // Sesuai spesifikasi: null jika data polusi absen
      explanation: {
        reasonCode: 'NO_ESTIMATE',
        text: 'Data kualitas udara tidak tersedia di sepanjang rute. Navigasi diarahkan murni berdasarkan waktu tempuh.',
        extraMinutes: null,
        extraPercent: null,
        exposureDeltaPercent: null,
        isSignificant: false,
      },
      actionMessages,
    };
  }

  // 5. Pemilihan Rute Berdasarkan Skor dan Filter
  // Ambil kandidat yang memenuhi syarat batas waktu dan tidak terdominasi Pareto
  const eligibleRoutes = analyzedRoutes.filter(
    (r) => r.withinTimeLimit && !r.isDominated
  );

  let chosenRoute: AnalyzedRoute;

  if (eligibleRoutes.length > 0) {
    // Urutkan berdasarkan skor terendah
    eligibleRoutes.sort((a, b) => (a.score ?? 999) - (b.score ?? 999));
    chosenRoute = eligibleRoutes[0];
  } else {
    // Fallback ke rute tercepat jika seluruh alternatif melewati batas waktu
    chosenRoute =
      analyzedRoutes.find((r) => r.isFastest) || analyzedRoutes[0];
  }

  // 6. Uji Ambang Batas Signifikansi 5% (PAR-07) (TC-10)
  // Jika rute alternatif terpilih memiliki penurunan polusi < 5% dibanding rute tercepat,
  // maka rute tercepat diprioritaskan karena efisiensi waktu lebih berharga.
  const fastestAnalyzed =
    analyzedRoutes.find((r) => r.isFastest) || analyzedRoutes[0];

  let explanation: ExplanationInfo;

  if (chosenRoute.id === fastestAnalyzed.id) {
    // Rute tercepat terpilih
    // Periksa apakah ada rute alternatif ber-EI lebih bersih namun perbedaannya tidak signifikan (< 5%)
    const nonSigAlt = analyzedRoutes.find(
      (r) =>
        r.id !== fastestAnalyzed.id &&
        r.comparison.exposureDeltaPercent !== null &&
        r.comparison.exposureDeltaPercent < 0 &&
        Math.abs(r.comparison.exposureDeltaPercent) < params.significanceThresholdPercent
    );

    if (nonSigAlt) {
      explanation = {
        reasonCode: 'DIFFERENCE_NOT_SIGNIFICANT',
        text: `Perbedaan estimasi paparan polusi alternatif ${nonSigAlt.label} tidak signifikan (< 5%). Rute tercepat direkomendasikan untuk efisiensi waktu.`,
        extraMinutes: 0,
        extraPercent: 0,
        exposureDeltaPercent: nonSigAlt.comparison.exposureDeltaPercent,
        isSignificant: false,
      };
    } else {
      explanation = {
        reasonCode: 'FASTEST_IS_BEST',
        text: 'Rute tercepat direkomendasikan karena memberikan efisiensi waktu terbaik tanpa peningkatan risiko polusi yang berarti.',
        extraMinutes: 0,
        extraPercent: 0,
        exposureDeltaPercent: 0,
        isSignificant: false,
      };
    }
  } else {
    const extraMin = Math.round(chosenRoute.comparison.extraSeconds / 60);
    const expDelta = chosenRoute.comparison.exposureDeltaPercent;
    const isSignificant =
      expDelta !== null && expDelta <= -params.significanceThresholdPercent;

    if (isSignificant) {
      explanation = {
        reasonCode: 'BETTER_EXPOSURE',
        text: `Rute ${chosenRoute.label} direkomendasikan karena menghemat paparan polusi sebesar ${Math.abs(
          expDelta!
        )}% dengan tambahan waktu ${extraMin} menit (+${chosenRoute.comparison.extraPercent}%).`,
        extraMinutes: extraMin,
        extraPercent: chosenRoute.comparison.extraPercent,
        exposureDeltaPercent: expDelta,
        isSignificant: true,
      };
    } else {
      // Pengurangan polusi tidak signifikan (< 5% / PAR-07) -> fallback ke rute tercepat (TC-10)
      chosenRoute = fastestAnalyzed;
      explanation = {
        reasonCode: 'DIFFERENCE_NOT_SIGNIFICANT',
        text: 'Perbedaan estimasi paparan polusi alternatif tidak signifikan (< 5%). Rute tercepat direkomendasikan untuk efisiensi waktu.',
        extraMinutes: 0,
        extraPercent: 0,
        exposureDeltaPercent: expDelta,
        isSignificant: false,
      };
    }
  }

  // 7. Evaluasi pesan rekomendasi aksi proteksi kesehatan
  const actionMessages: ActionMessage[] = evaluateRecommendations({
    recommendedRoute: chosenRoute,
    fastestRoute: fastestAnalyzed,
    allRoutes: analyzedRoutes,
    now,
  });

  return {
    routes: analyzedRoutes,
    recommendedRouteLabel: chosenRoute.label,
    explanation,
    actionMessages,
  };
}
