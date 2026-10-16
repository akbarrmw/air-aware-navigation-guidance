import { StationData } from '@/types/air-quality';
import { fetchWithTimeout } from '@/lib/utils/fetchWithTimeout';
import { normalizeStation } from './normalizeStation';
import { appCache } from '@/lib/utils/cache';

interface WaqiBoundsItem {
  lat: number;
  lon: number;
  uid: number;
  aqi: string;
  station: {
    name: string;
    time: string;
  };
}

interface WaqiFeedResponse {
  status: string;
  data?: {
    idx: number;
    aqi: number;
    time?: {
      iso?: string;
      s?: string;
    };
    city?: {
      name?: string;
      geo?: [number, number];
    };
    dominentpol?: string;
    iaqi?: {
      pm25?: { v: number };
      pm10?: { v: number };
    };
  };
}

/**
 * Mengambil detail data feed stasiun dari WAQI berdasarkan UID stasiun.
 */
export async function fetchWaqiStationFeed(
  uid: number,
  token: string
): Promise<{ pm25: number | null; pm10: number | null; timeIso: string | null } | null> {
  const cacheKey = `waqi_feed_${uid}`;
  const cached = appCache.get<{ pm25: number | null; pm10: number | null; timeIso: string | null }>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://api.waqi.info/feed/@${uid}/?token=${token}`;
    const res = await fetchWithTimeout(url, { timeoutMs: 5000 });
    if (!res.ok) return null;

    const json: WaqiFeedResponse = await res.json();
    if (json.status !== 'ok' || !json.data) return null;

    const pm25 = json.data.iaqi?.pm25?.v ?? null;
    const pm10 = json.data.iaqi?.pm10?.v ?? null;
    const timeIso = json.data.time?.iso ?? null;

    const result = { pm25, pm10, timeIso };
    appCache.set(cacheKey, result, 10); // Cache 10 menit
    return result;
  } catch (err) {
    console.warn(`[WAQI Adapter] Gagal mengambil detail feed untuk UID ${uid}:`, err);
    return null;
  }
}

/**
 * Mengambil daftar stasiun kualitas udara WAQI dalam batas area koordinat tertentu.
 */
export async function fetchWaqiStationsInBounds(
  bounds: { south: number; west: number; north: number; east: number },
  token?: string
): Promise<StationData[]> {
  const waqiToken = token || process.env.WAQI_TOKEN;
  if (!waqiToken || waqiToken === 'demo') {
    return [];
  }

  const cacheKey = `waqi_bounds_${bounds.south}_${bounds.west}_${bounds.north}_${bounds.east}`;
  const cached = appCache.get<StationData[]>(cacheKey);
  if (cached) return cached;

  const url = `https://api.waqi.info/v2/map/bounds?latlng=${bounds.south},${bounds.west},${bounds.north},${bounds.east}&token=${waqiToken}`;

  const res = await fetchWithTimeout(url, { timeoutMs: 6000 });
  if (!res.ok) {
    throw new Error(`WAQI API bounds error: status ${res.status}`);
  }

  const json = await res.json();
  if (json.status !== 'ok' || !Array.isArray(json.data)) {
    return [];
  }

  const rawStations: WaqiBoundsItem[] = json.data;

  // Filter stasiun yang memiliki nama dan koordinat valid di Indonesia (-11.5 s/d 6.5 lat, 94.5 s/d 141.5 lon)
  const validStations = rawStations.filter(
    (item) =>
      item.lat >= -11.5 &&
      item.lat <= 6.5 &&
      item.lon >= 94.5 &&
      item.lon <= 141.5 &&
      item.station?.name &&
      item.station.name.trim().length > 0
  );

  const stationsToUse = validStations.length > 0 ? validStations : rawStations;

  // Ambil detail feed untuk 8 stasiun pertama, sisanya gunakan data AQI dari bounds API
  const stationsToEnrich = stationsToUse.slice(0, 8);
  const stationsLight = stationsToUse.slice(8, 45);

  const enrichedList: StationData[] = await Promise.all(
    stationsToEnrich.map(async (item) => {
      const aqiNum = item.aqi === '-' ? null : parseInt(item.aqi, 10);
      const feedDetail = await fetchWaqiStationFeed(item.uid, waqiToken);

      return normalizeStation({
        stationId: `waqi-${item.uid}`,
        stationName: item.station?.name || `WAQI Station ${item.uid}`,
        lat: item.lat,
        lng: item.lon,
        aqi: isNaN(aqiNum as number) ? null : aqiNum,
        pm25Concentration: feedDetail?.pm25 ?? null,
        pm10Concentration: feedDetail?.pm10 ?? null,
        observedAt: feedDetail?.timeIso || item.station?.time || new Date().toISOString(),
        dataType: 'station_observation',
        sourceName: 'WAQI (aqicn.org)',
      });
    })
  );

  const lightList: StationData[] = stationsLight.map((item) => {
    const aqiNum = item.aqi === '-' ? null : parseInt(item.aqi, 10);
    return normalizeStation({
      stationId: `waqi-${item.uid}`,
      stationName: item.station.name,
      lat: item.lat,
      lng: item.lon,
      aqi: isNaN(aqiNum as number) ? null : aqiNum,
      pm25Concentration: null,
      pm10Concentration: null,
      observedAt: item.station?.time || new Date().toISOString(),
      dataType: 'station_observation',
      sourceName: 'WAQI (aqicn.org)',
    });
  });

  const normalizedList = [...enrichedList, ...lightList];

  if (normalizedList.length > 0) {
    appCache.set(cacheKey, normalizedList, 10); // Cache 10 menit
  }

  return normalizedList;
}
