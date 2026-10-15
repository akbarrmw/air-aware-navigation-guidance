import { StationData } from '@/types/air-quality';
import { fetchWithTimeout } from '@/lib/utils/fetchWithTimeout';
import { normalizeStation } from './normalizeStation';
import { appCache } from '@/lib/utils/cache';

interface OpenMeteoAirQualityResponse {
  current?: {
    time?: string;
    pm10?: number;
    pm2_5?: number;
    us_aqi?: number;
  };
}

/**
 * Adapter untuk mengambil data polusi model Open-Meteo (FR-17 Fallback)
 * Pemilik: Person 2 (Backend Services)
 */
export async function fetchOpenMeteoAirQuality(
  lat: number,
  lng: number,
  locationName: string = 'Open-Meteo Grid Point'
): Promise<StationData | null> {
  const roundedLat = Number(lat.toFixed(2));
  const roundedLng = Number(lng.toFixed(2));
  const cacheKey = `open_meteo_${roundedLat}_${roundedLng}`;

  const cached = appCache.get<StationData>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${roundedLat}&longitude=${roundedLng}&current=pm10,pm2_5,us_aqi`;
    const res = await fetchWithTimeout(url, { timeoutMs: 5000 });
    if (!res.ok) return null;

    const json: OpenMeteoAirQualityResponse = await res.json();
    if (!json.current) return null;

    const pm25 = json.current.pm2_5 ?? null;
    const pm10 = json.current.pm10 ?? null;
    const aqi = json.current.us_aqi ?? null;
    const time = json.current.time ? `${json.current.time}:00Z` : new Date().toISOString();

    const normalized = normalizeStation({
      stationId: `openmeteo-${roundedLat}-${roundedLng}`,
      stationName: `${locationName} (Model Open-Meteo)`,
      lat: roundedLat,
      lng: roundedLng,
      aqi,
      pm25Concentration: pm25,
      pm10Concentration: pm10,
      observedAt: time,
      dataType: 'model_fallback',
      sourceName: 'Open-Meteo Air Quality Model',
    });

    appCache.set(cacheKey, normalized, 15); // Cache 15 menit
    return normalized;
  } catch (err) {
    console.warn(`[Open-Meteo Adapter] Gagal mengambil data model untuk [${lat}, ${lng}]:`, err);
    return null;
  }
}
