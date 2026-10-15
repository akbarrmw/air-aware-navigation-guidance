import { CONSTANTS } from '@/config/constants';
import { fetchWithTimeout } from '@/lib/utils/fetchWithTimeout';
import { appCache } from '@/lib/utils/cache';

export interface GeocodeCandidate {
  label: string;
  lat: number;
  lng: number;
  withinPilotArea: boolean;
}

/**
 * Mengecek apakah koordinat berada di dalam area pilot (Semarang)
 */
export function isPointWithinPilotArea(lat: number, lng: number): boolean {
  const [minLat, minLng, maxLat, maxLng] = CONSTANTS.PILOT_CITY.BBOX;
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

/**
 * Service Geocoding via Nominatim OpenStreetMap
 * Pemilik: Person 2 (Backend Services)
 */
export async function searchGeocode(query: string): Promise<GeocodeCandidate[]> {
  const q = query.trim();
  if (!q || q.length < 3) {
    return [];
  }

  const isSimulation = process.env.DATA_MODE === 'simulation';
  if (isSimulation) {
    return [
      {
        label: `${q} (Simpang Lima, Semarang)`,
        lat: -6.9928,
        lng: 110.4222,
        withinPilotArea: true,
      },
      {
        label: `${q} (Kampus Undip Tembalang, Semarang)`,
        lat: -7.0514,
        lng: 110.4388,
        withinPilotArea: true,
      },
    ];
  }

  const normalizedKey = `geocode_${q.toLowerCase()}`;
  const cached = appCache.get<GeocodeCandidate[]>(normalizedKey);
  if (cached) {
    return cached;
  }

  try {
    const [minLat, minLng, maxLat, maxLng] = CONSTANTS.PILOT_CITY.BBOX;
    // Menambahkan viewbox untuk membias pencarian ke area pilot
    const url = `${CONSTANTS.DEFAULT_GEOCODER_URL}/search?format=json&limit=5&viewbox=${minLng},${maxLat},${maxLng},${minLat}&bounded=0&q=${encodeURIComponent(
      q
    )}`;

    const res = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': CONSTANTS.DEFAULT_USER_AGENT,
      },
      timeoutMs: 5000,
    });

    if (!res.ok) {
      throw new Error(`Nominatim error: status ${res.status}`);
    }

    const json = await res.json();
    if (!Array.isArray(json)) return [];

    const candidates: GeocodeCandidate[] = json.map((item: { display_name: string; lat: string; lon: string }) => {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      return {
        label: item.display_name,
        lat,
        lng,
        withinPilotArea: isPointWithinPilotArea(lat, lng),
      };
    });

    if (candidates.length > 0) {
      appCache.set(normalizedKey, candidates, 1440); // Cache 24 jam
    }

    return candidates;
  } catch (err) {
    console.error('[GeocodingService] Gagal menghubungi Nominatim:', err);
    throw err;
  }
}
