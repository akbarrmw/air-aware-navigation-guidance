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
 * Mengecek apakah koordinat berada di dalam area pilot Semarang.
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
 * Daftar lokasi offline fallback dengan koordinat nyata akurat
 * Digunakan jika Nominatim OpenStreetMap sedang offline atau tidak dapat diakses
 */
const OFFLINE_PLACES: Array<{ name: string; aliases: string[]; lat: number; lng: number }> = [
  {
    name: 'Universitas Diponegoro (Undip Tembalang), Semarang',
    aliases: ['undip', 'universitas diponegoro', 'tembalang', 'kampus undip'],
    lat: -7.0515,
    lng: 110.4395,
  },
  {
    name: 'Simpang Lima, Kota Semarang',
    aliases: ['simpang lima', 'simpang 5', 'semarang', 'pusat semarang'],
    lat: -6.9928,
    lng: 110.4222,
  },
  {
    name: 'Tugu Muda & Lawang Sewu, Kota Semarang',
    aliases: ['tugu muda', 'lawang sewu', 'pandanaran'],
    lat: -6.9840,
    lng: 110.4093,
  },
  {
    name: 'Stasiun Semarang Tawang, Kota Semarang',
    aliases: ['stasiun tawang', 'tawang', 'semarang tawang'],
    lat: -6.9644,
    lng: 110.4281,
  },
  {
    name: 'Stasiun Semarang Poncol, Kota Semarang',
    aliases: ['stasiun poncol', 'poncol'],
    lat: -6.9729,
    lng: 110.4150,
  },
  {
    name: 'Bandara Internasional Jenderal Ahmad Yani, Semarang',
    aliases: ['bandara ahmad yani', 'bandara semarang', 'ahmad yani airport'],
    lat: -6.9734,
    lng: 110.3756,
  },
  {
    name: 'Monumen Nasional (Monas), Gambir, Jakarta Pusat',
    aliases: ['monas', 'monumen nasional', 'gambir', 'jakarta pusat'],
    lat: -6.1754,
    lng: 106.8272,
  },
  {
    name: 'Bundaran Hotel Indonesia (HI), Menteng, Jakarta Pusat',
    aliases: ['bundaran hi', 'hotel indonesia', 'thamrin', 'sudirman'],
    lat: -6.1950,
    lng: 106.8230,
  },
  {
    name: 'Gedung Sate, Bandung, Jawa Barat',
    aliases: ['gedung sate', 'bandung', 'dago'],
    lat: -6.9025,
    lng: 107.6186,
  },
  {
    name: 'Jalan Malioboro, Kota Yogyakarta',
    aliases: ['malioboro', 'jogja', 'yogyakarta', 'stasiun tugu'],
    lat: -7.7926,
    lng: 110.3658,
  },
  {
    name: 'Tugu Pahlawan, Kota Surabaya, Jawa Timur',
    aliases: ['tugu pahlawan', 'surabaya'],
    lat: -7.2458,
    lng: 112.7378,
  },
  {
    name: 'Pantai Kuta, Badung, Bali',
    aliases: ['kuta', 'pantai kuta', 'bali', 'denpasar'],
    lat: -8.7185,
    lng: 115.1686,
  },
  {
    name: 'Lapangan Merdeka, Kota Medan, Sumatera Utara',
    aliases: ['merdeka medan', 'medan', 'lapangan merdeka'],
    lat: 3.5908,
    lng: 98.6781,
  },
  {
    name: 'Kawasan Inti IKN Nusantara, Penajam Paser Utara',
    aliases: ['ikn', 'nusantara', 'ikn nusantara', 'titik nol'],
    lat: -0.9634,
    lng: 116.7088,
  },
];

/**
 * Mencari kandidat koordinat lokasi berdasarkan kata kunci pencarian.
 */
export async function searchGeocode(query: string): Promise<GeocodeCandidate[]> {
  const q = query.trim();
  if (!q || q.length < 2) {
    return [];
  }

  const normalizedKey = `geocode_${q.toLowerCase()}`;
  const cached = appCache.get<GeocodeCandidate[]>(normalizedKey);
  if (cached) {
    return cached;
  }

  // 1. Coba pencarian realtime ke Nominatim OpenStreetMap (prioritas data riil akurat)
  try {
    const url = `${CONSTANTS.DEFAULT_GEOCODER_URL}/search?format=json&limit=8&countrycodes=id&q=${encodeURIComponent(
      q
    )}`;

    const res = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': CONSTANTS.DEFAULT_USER_AGENT,
      },
      timeoutMs: 5000,
    });

    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json) && json.length > 0) {
        const candidates: GeocodeCandidate[] = json.map(
          (item: { display_name: string; lat: string; lon: string }) => {
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            return {
              label: item.display_name,
              lat,
              lng,
              withinPilotArea: isPointWithinPilotArea(lat, lng) || isPointWithinIndonesia(lat, lng),
            };
          }
        );

        appCache.set(normalizedKey, candidates, 1440); // Cache 24 jam
        return candidates;
      }
    }
  } catch (err) {
    console.warn('[GeocodingService] Nominatim unavailable or timeout, fallback to offline database:', err);
  }

  // 2. Fallback offline pintar jika Nominatim gagal / tidak ada koneksi
  const qLower = q.toLowerCase();
  const matchedOffline = OFFLINE_PLACES.filter(
    (place) =>
      place.name.toLowerCase().includes(qLower) ||
      place.aliases.some((alias) => qLower.includes(alias) || alias.includes(qLower))
  );

  if (matchedOffline.length > 0) {
    return matchedOffline.map((place) => ({
      label: place.name,
      lat: place.lat,
      lng: place.lng,
      withinPilotArea: isPointWithinPilotArea(place.lat, place.lng),
    }));
  }

  return [];
}
