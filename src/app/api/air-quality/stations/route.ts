import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/errorHandler';
import { getAirQualityStations } from '@/lib/services/airQualityService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const south = searchParams.get('south');
    const west = searchParams.get('west');
    const north = searchParams.get('north');
    const east = searchParams.get('east');

    let bounds;
    if (south && west && north && east) {
      const s = parseFloat(south);
      const w = parseFloat(west);
      const n = parseFloat(north);
      const e = parseFloat(east);

      if (isNaN(s) || isNaN(w) || isNaN(n) || isNaN(e)) {
        return createErrorResponse(
          'INVALID_BOUNDS',
          'Parameter koordinat bounding box (south, west, north, east) harus berupa angka',
          400
        );
      }
      bounds = { south: s, west: w, north: n, east: e };
    }

    const stations = await getAirQualityStations(bounds);
    return createSuccessResponse(stations);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'digest' in err && String((err as { digest: unknown }).digest).startsWith('NEXT_')) {
      throw err;
    }
    console.error('[API Stations] Error:', err);
    return createErrorResponse(
      'AIR_QUALITY_ERROR',
      'Gagal memuat stasiun kualitas udara dari penyedia',
      502,
      err instanceof Error ? err.message : String(err)
    );
  }
}
