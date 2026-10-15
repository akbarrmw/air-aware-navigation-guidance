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
 * Mengecek apakah koordinat berada di dalam wilayah Indonesia
 */
export function isPointWithinIndonesia(lat: number, lng: number): boolean {
  return lat >= -11.5 && lat <= 6.5 && lng >= 94.5 && lng <= 141.5;
}

/**
 * Service Geocoding via Nominatim OpenStreetMap (Cakupan Seluruh Indonesia)
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
        label: `${q} (Monumen Nasional / Monas, Jakarta Pusat)`,
        lat: -6.1754,
        lng: 106.8272,
        withinPilotArea: true,
      },
      {
        label: `${q} (Bundaran HI, Jakarta Pusat)`,
        lat: -6.1950,
        lng: 106.8230,
        withinPilotArea: true,
      },
      {
        label: `${q} (Simpang Lima, Semarang)`,
        lat: -6.9928,
        lng: 110.4222,
        withinPilotArea: true,
      },
      {
        label: `${q} (Gedung Sate, Bandung)`,
        lat: -6.9025,
        lng: 107.6186,
        withinPilotArea: true,
      },
      {
        label: `${q} (Tugu Pahlawan, Surabaya)`,
        lat: -7.2458,
        lng: 112.7378,
        withinPilotArea: true,
      },
      {
        label: `${q} (Malioboro, Yogyakarta)`,
        lat: -7.7926,
        lng: 110.3658,
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
    // Cari lokasi di seluruh wilayah Indonesia (countrycodes=id)
    const url = `${CONSTANTS.DEFAULT_GEOCODER_URL}/search?format=json&limit=8&countrycodes=id&q=${encodeURIComponent(
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
        withinPilotArea: isPointWithinPilotArea(lat, lng) || isPointWithinIndonesia(lat, lng),
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
