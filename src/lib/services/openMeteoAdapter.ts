import { StationData } from '@/types/air-quality';
import { fetchWithTimeout } from '@/lib/utils/fetchWithTimeout';
import { normalizeStation } from './normalizeStation';
import { appCache } from '@/lib/utils/cache';

interface OpenMeteoItem {
  latitude: number;
  longitude: number;
  current?: {
    time?: string;
    pm10?: number;
    pm2_5?: number;
    us_aqi?: number;
  };
}

/** Titik-titik referensi regional di berbagai kota Indonesia untuk integrasi Open-Meteo */
export const INDONESIA_REGIONAL_POINTS = [
  { name: 'DKI Jakarta (Pusat)', lat: -6.21, lng: 106.85 },
  { name: 'Bandung (Jawa Barat)', lat: -6.92, lng: 107.62 },
  { name: 'Semarang (Jawa Tengah)', lat: -6.99, lng: 110.42 },
  { name: 'Surabaya (Jawa Timur)', lat: -7.26, lng: 112.75 },
  { name: 'D.I. Yogyakarta', lat: -7.80, lng: 110.37 },
  { name: 'Denpasar (Bali)', lat: -8.67, lng: 115.21 },
  { name: 'Medan (Sumatera Utara)', lat: 3.60, lng: 98.67 },
  { name: 'Palembang (Sumatera Selatan)', lat: -2.98, lng: 104.78 },
  { name: 'IKN Nusantara (Kalimantan Timur)', lat: -0.96, lng: 116.71 },
  { name: 'Pontianak (Kalimantan Barat)', lat: -0.03, lng: 109.34 },
  { name: 'Makassar (Sulawesi Selatan)', lat: -5.15, lng: 119.43 },
  { name: 'Manado (Sulawesi Utara)', lat: 1.48, lng: 124.84 },
];

/**
 * Adapter untuk mengambil data polusi model Open-Meteo untuk satu titik (FR-17 Fallback)
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

    const json = await res.json();
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

/**
 * Mengambil sekumpulan titik stasiun model Open-Meteo secara batch di berbagai wilayah Indonesia
 */
export async function fetchOpenMeteoMultiStations(
  points: Array<{ name: string; lat: number; lng: number }> = INDONESIA_REGIONAL_POINTS
): Promise<StationData[]> {
  const cacheKey = `open_meteo_multi_${points.length}`;
  const cached = appCache.get<StationData[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  try {
    const lats = points.map((p) => p.lat.toFixed(2)).join(',');
    const lngs = points.map((p) => p.lng.toFixed(2)).join(',');

    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lngs}&current=pm10,pm2_5,us_aqi`;
    const res = await fetchWithTimeout(url, { timeoutMs: 7000 });
    if (!res.ok) return [];

    const json = await res.json();
    const items: OpenMeteoItem[] = Array.isArray(json) ? json : [json];

    const results: StationData[] = items
      .map((item, index) => {
        if (!item.current) return null;
        const pt = points[index] || { name: `Grid [${item.latitude}, ${item.longitude}]` };
        const pm25 = item.current.pm2_5 ?? null;
        const pm10 = item.current.pm10 ?? null;
        const aqi = item.current.us_aqi ?? null;
        const time = item.current.time ? `${item.current.time}:00Z` : new Date().toISOString();

        return normalizeStation({
          stationId: `openmeteo-${item.latitude.toFixed(2)}-${item.longitude.toFixed(2)}`,
          stationName: `${pt.name} (Model Open-Meteo)`,
          lat: Number(item.latitude.toFixed(4)),
          lng: Number(item.longitude.toFixed(4)),
          aqi,
          pm25Concentration: pm25,
          pm10Concentration: pm10,
          observedAt: time,
          dataType: 'model_fallback',
          sourceName: 'Open-Meteo Model',
        });
      })
      .filter((st): st is StationData => st !== null);

    if (results.length > 0) {
      appCache.set(cacheKey, results, 15); // Cache 15 menit
    }

    return results;
  } catch (err) {
    console.warn('[Open-Meteo Adapter] Gagal mengambil stasiun multi-lokasi:', err);
    return [];
  }
}
