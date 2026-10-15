import { createSuccessResponse, createErrorResponse } from '@/lib/utils/errorHandler';
import { MOCK_STATIONS } from '@/fixtures/mockStations';
import { appCache } from '@/lib/utils/cache';
import { StationData } from '@/types/air-quality';
import { ECOPULSE_PARAMS } from '@/config/parameters';

export async function GET() {
  try {
    const isSimulation = process.env.DATA_MODE === 'simulation';
    const cacheKey = 'air_quality_stations_pilot';

    const cached = appCache.get<StationData[]>(cacheKey);
    if (cached) {
      return createSuccessResponse(cached);
    }

    if (isSimulation || !process.env.WAQI_TOKEN || process.env.WAQI_TOKEN === 'demo') {
      appCache.set(cacheKey, MOCK_STATIONS, ECOPULSE_PARAMS.PAR_12_CACHE_TTL_MINUTES);
      return createSuccessResponse(MOCK_STATIONS);
    }

    // TODO: Live WAQI fetch jika token aktif
    appCache.set(cacheKey, MOCK_STATIONS, ECOPULSE_PARAMS.PAR_12_CACHE_TTL_MINUTES);
    return createSuccessResponse(MOCK_STATIONS);
  } catch (err) {
    return createErrorResponse('UPSTREAM_ERROR', 'Gagal memuat stasiun kualitas udara', 500, err);
  }
}
