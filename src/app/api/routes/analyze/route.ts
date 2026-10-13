import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/errorHandler';
import { runAnalysisPipeline } from '@/lib/services/pipelineService';

const analyzeSchema = z.object({
  origin: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  destination: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  preferences: z
    .object({
      exposureWeight: z.number().min(0).max(1).default(0.5),
      maxExtraTimePercent: z.number().min(0).max(100).nullable().default(30),
    })
    .default({ exposureWeight: 0.5, maxExtraTimePercent: 30 }),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const parsed = analyzeSchema.safeParse(body);

    if (!parsed.success) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Data masukan rute atau preferensi tidak valid',
        400,
        parsed.error.issues
      );
    }

    const { origin, destination, preferences } = parsed.data;

    const result = await runAnalysisPipeline({
      origin,
      destination,
      preferences,
    });

    const elapsed = Date.now() - startTime;
    return createSuccessResponse(result, elapsed);
  } catch (err) {
    return createErrorResponse(
      'ANALYZE_ERROR',
      'Terjadi kendala saat menganalisis alternatif rute dan polusi udara',
      500,
      err
    );
  }
}
