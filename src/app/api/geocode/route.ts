import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/errorHandler';
import { searchGeocode } from '@/lib/services/geocodingService';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q || q.trim().length < 3) {
    return createErrorResponse('INVALID_QUERY', 'Kata kunci pencarian minimal 3 karakter', 400);
  }

  try {
    const results = await searchGeocode(q);
    return createSuccessResponse(results);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'digest' in err && String((err as { digest: unknown }).digest).startsWith('NEXT_')) {
      throw err;
    }
    console.error('[API Geocode] Error:', err);
    return createErrorResponse(
      'GEOCODE_FAILED',
      'Gagal menghubungi penyedia peta geocoding',
      502,
      err instanceof Error ? err.message : String(err)
    );
  }
}
