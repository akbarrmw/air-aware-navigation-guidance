import { StationData } from '@/types/air-quality';
import { MOCK_STATIONS } from '@/fixtures/mockStations';
import { fetchWaqiStationsInBounds } from './waqiAdapter';
import { fetchOpenMeteoAirQuality } from './openMeteoAdapter';
import { CONSTANTS } from '@/config/constants';
import { appCache } from '@/lib/utils/cache';

export interface AirQualityBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

/**
 * Service pengelola data kualitas udara:
 * 1. Mode simulasi: langsung mengembalikan MOCK_STATIONS
 * 2. Mode live: WAQI -> Fallback Open-Meteo jika stasiun minim -> In-memory cache -> Fallback fixture jika gagal total
 * Pemilik: Person 2 (Backend Services)
 */
export async function getAirQualityStations(
  bounds?: AirQualityBounds
): Promise<StationData[]> {
  const isSimulation = process.env.DATA_MODE === 'simulation';
  if (isSimulation) {
    return MOCK_STATIONS;
  }

  const effectiveBounds = bounds || {
    south: CONSTANTS.PILOT_CITY.BBOX[0],
    west: CONSTANTS.PILOT_CITY.BBOX[1],
    north: CONSTANTS.PILOT_CITY.BBOX[2],
    east: CONSTANTS.PILOT_CITY.BBOX[3],
  };

  const cacheKey = `aq_stations_${effectiveBounds.south}_${effectiveBounds.west}_${effectiveBounds.north}_${effectiveBounds.east}`;
  const cached = appCache.get<StationData[]>(cacheKey);
  if (cached && cached.length > 0) {
    return cached;
  }

  try {
    // 1. Coba ambil dari WAQI
    let stations = await fetchWaqiStationsInBounds(effectiveBounds);

    // 2. Jika stasiun observasi WAQI kurang dari 2 di area tersebut, lengkapi dengan titik model Open-Meteo
    if (stations.length < 2) {
      const centerLat = (effectiveBounds.south + effectiveBounds.north) / 2;
      const centerLng = (effectiveBounds.west + effectiveBounds.east) / 2;

      const fallbackPoint = await fetchOpenMeteoAirQuality(
        centerLat,
        centerLng,
        CONSTANTS.PILOT_CITY.NAME
      );

      if (fallbackPoint) {
        stations = [...stations, fallbackPoint];
      }
    }

    if (stations.length > 0) {
      appCache.set(cacheKey, stations, 10); // Cache 10 menit
      return stations;
    }

    // Jika live API tidak mengembalikan stasiun, fallback ke mock dengan peringatan
    console.warn('[AirQualityService] Tidak ada stasiun ditemukan dari live provider, menggunakan fallback data.');
    return MOCK_STATIONS;
  } catch (err) {
    console.error('[AirQualityService] Gagal memuat stasiun live:', err);
    return MOCK_STATIONS;
  }
}
