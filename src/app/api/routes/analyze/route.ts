/**
 * @file route.ts
 * @description Endpoint analisis rute dan estimasi paparan polusi udara (POST /api/routes/analyze).
 * @author Person 2 (Backend & External APIs) / Refactored with withApiHandler by Person 1
 * @module app/api/routes/analyze/route
 * @see CODE_SPEC_AANG.md Bagian 6 & 11 (Gate G0)
 */

import { withApiHandler } from '@/lib/server/withApiHandler';
import { AnalyzeRoutesRequestSchema, type AnalyzeRoutesRequestInput } from '@/types/schemas';
import { runAnalysisPipeline } from '@/lib/services/pipelineService';
import type { AnalyzeRoutesResponseData } from '@/types/analyze';

/**
 * Handler POST /api/routes/analyze
 * Menerima titik origin, destination, dan preferensi rute, lalu mengembalikan analisis komparatif rute A/B/C.
 */
export const POST = withApiHandler<AnalyzeRoutesResponseData, AnalyzeRoutesRequestInput>(
  async ({ body }) => {
    const { origin, destination, preferences, transportMode } = body;

    const result = await runAnalysisPipeline({
      origin: { lat: origin.lat, lng: origin.lng },
      destination: { lat: destination.lat, lng: destination.lng },
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
