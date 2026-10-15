/**
 * @file scoring.ts
 * @description Modul skoring multi-kriteria dan ranking rute (ALG-03).
 * Meneruskan fungsi keputusan ke decide.ts dan menyediakan adapter kompatibilitas untuk pipelineService.
 * 
 * @author Person 1 (Core Algorithm & System Integration)
 * @module lib/algorithms/scoring
 * @see CODE_SPEC_AANG.md Bagian 3.8 & Bagian 6 (ALG-03)
 */

import type { RouteCandidate } from '@/types/routing';
import type { RoutePreferences } from '@/types/preferences';
import type { RouteExposureEstimate } from '@/types/algorithms';
import { decideRoutes, type DecideRoutesInput } from './decide';

export { decideRoutes, type DecideRoutesInput };

/**
 * Adapter kompatibilitas transisi untuk backward compatibility dengan kode lama (pipelineService).
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
