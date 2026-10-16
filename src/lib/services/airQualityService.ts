import { StationData } from '@/types/air-quality';
import { MOCK_STATIONS } from '@/fixtures/mockStations';
import { fetchWaqiStationsInBounds } from './waqiAdapter';
import { fetchOpenMeteoAirQuality, fetchOpenMeteoMultiStations } from './openMeteoAdapter';
import { CONSTANTS } from '@/config/constants';
import { appCache } from '@/lib/utils/cache';

export interface AirQualityBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

/**
 * Mengambil data stasiun kualitas udara gabungan (WAQI dan Open-Meteo) untuk area tertentu.
 */
export async function getAirQualityStations(
  bounds?: AirQualityBounds
): Promise<StationData[]> {
  const effectiveBounds = bounds || {
    south: CONSTANTS.PILOT_CITY.BBOX[0],
    west: CONSTANTS.PILOT_CITY.BBOX[1],
    north: CONSTANTS.PILOT_CITY.BBOX[2],
    east: CONSTANTS.PILOT_CITY.BBOX[3],
  };

  const cacheKey = `aq_combined_stations_${effectiveBounds.south}_${effectiveBounds.west}_${effectiveBounds.north}_${effectiveBounds.east}`;
  const cached = appCache.get<StationData[]>(cacheKey);
  if (cached && cached.length > 0) {
    return cached;
  }

  try {
    // 1. Ambil stasiun observasi fisik dari WAQI
    const waqiStations = await fetchWaqiStationsInBounds(effectiveBounds);

    // 2. Ambil stasiun model cuaca & udara dari Open-Meteo (Realtime & Gratis tanpa API Key)
    let openMeteoStations: StationData[] = [];
    try {
      // Jika bounds luas (misal seluruh Indonesia), ambil titik regional Open-Meteo
      const isWideBounds =
        Math.abs(effectiveBounds.north - effectiveBounds.south) > 1.5 ||
        Math.abs(effectiveBounds.east - effectiveBounds.west) > 1.5;

      if (isWideBounds) {
        const allRegional = await fetchOpenMeteoMultiStations();
        openMeteoStations = allRegional.filter(
          (st) =>
            st.lat >= effectiveBounds.south &&
            st.lat <= effectiveBounds.north &&
            st.lng >= effectiveBounds.west &&
            st.lng <= effectiveBounds.east
        );
      } else {
        // Untuk koridor rute yang lebih spesifik, ambil titik tengah rute dari Open-Meteo
        const centerLat = (effectiveBounds.south + effectiveBounds.north) / 2;
        const centerLng = (effectiveBounds.west + effectiveBounds.east) / 2;
        const centerPoint = await fetchOpenMeteoAirQuality(centerLat, centerLng, 'Koridor Perjalanan');
        if (centerPoint) {
          openMeteoStations = [centerPoint];
        }
      }
    } catch (err) {
      console.warn('[AirQualityService] Gagal mengambil data Open-Meteo:', err);
    }

    // 3. Gabungkan data WAQI dan Open-Meteo (hindari duplikasi koordinat yang terlalu berdekatan < 4.4 km)
    const combinedStations: StationData[] = [...waqiStations];

    for (const omStation of openMeteoStations) {
      const isTooClose = waqiStations.some((w) => {
        const dLat = Math.abs(w.lat - omStation.lat);
        const dLng = Math.abs(w.lng - omStation.lng);
        return dLat < 0.04 && dLng < 0.04;
      });

      if (!isTooClose) {
        combinedStations.push(omStation);
      }
    }

    if (combinedStations.length > 0) {
      appCache.set(cacheKey, combinedStations, 10); // Cache 10 menit
      return combinedStations;
    }

    // Jika live API tidak mengembalikan stasiun, fallback ke cadangan offline
    console.warn('[AirQualityService] Tidak ada stasiun ditemukan dari live provider, menggunakan fallback data.');
    return MOCK_STATIONS;
  } catch (err) {
    console.error('[AirQualityService] Gagal memuat stasiun live:', err);
    return MOCK_STATIONS;
  }
}
