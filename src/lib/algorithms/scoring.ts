/**
 * Modul skoring multi-kriteria dan perangkingan rute.
 */

import type { RouteCandidate } from '@/types/routing';
import type { RoutePreferences } from '@/types/preferences';
import type { RouteExposureEstimate } from '@/types/algorithms';
import { decideRoutes, type DecideRoutesInput } from './decide';

export { decideRoutes, type DecideRoutesInput };

/**
 * Melakukan skoring dan perangkingan rute alternatif berdasarkan preferensi pengguna.
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
