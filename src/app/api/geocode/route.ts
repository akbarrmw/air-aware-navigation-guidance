import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/errorHandler';
import { CONSTANTS } from '@/config/constants';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q || q.trim().length < 3) {
    return createErrorResponse('INVALID_QUERY', 'Kata kunci pencarian minimal 3 karakter', 400);
  }

  // Jika mode simulasi atau offline
  if (process.env.DATA_MODE === 'simulation') {
    return createSuccessResponse([
      {
        label: `${q.trim()} (Simpang Lima, Semarang)`,
        lat: -6.9928,
        lng: 110.4222,
      },
      {
        label: `${q.trim()} (Kampus Undip Tembalang, Semarang)`,
        lat: -7.0514,
        lng: 110.4388,
      },
    ]);
  }

  try {
    const url = `${CONSTANTS.DEFAULT_GEOCODER_URL}/search?format=json&limit=5&q=${encodeURIComponent(
      q
    )}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': CONSTANTS.DEFAULT_USER_AGENT,
      },
    });

    if (!res.ok) {
      return createErrorResponse('GEOCODE_FAILED', 'Gagal menghubungi penyedia peta geocoding', 502);
    }

    const json = await res.json();
    const results = json.map((item: { display_name: string; lat: string; lon: string }) => ({
      label: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));

    return createSuccessResponse(results);
  } catch (err) {
    return createErrorResponse('SERVER_ERROR', 'Terjadi kesalahan saat memproses geocoding', 500, err);
  }
}
