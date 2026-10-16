/**
 * Endpoint analisis rute dan estimasi paparan polusi udara.
 */

import { withApiHandler } from '@/lib/server/withApiHandler';
import { AnalyzeRoutesRequestSchema, type AnalyzeRoutesRequestInput } from '@/types/schemas';
import { runAnalysisPipeline } from '@/lib/services/pipelineService';
import type { AnalyzeRoutesResponseData } from '@/types/analyze';

/**
 * Handler POST untuk analisis komparatif rute alternatif.
 */
export const POST = withApiHandler<AnalyzeRoutesResponseData, AnalyzeRoutesRequestInput>(
  async ({ body }) => {
    const { origin, destination, waypoints, preferences, transportMode } = body;

    const result = await runAnalysisPipeline({
      origin: { lat: origin.lat, lng: origin.lng },
      destination: { lat: destination.lat, lng: destination.lng },
      waypoints: waypoints?.map((wp) => ({ lat: wp.lat, lng: wp.lng, label: wp.label })),
      preferences: {
        exposureWeight: preferences.exposureWeight,
        maxExtraTimePercent: preferences.maxExtraTimePercent,
      },
      transportMode: transportMode || 'car',
    });

    return result;
  },
  {
    bodySchema: AnalyzeRoutesRequestSchema,
  }
);
