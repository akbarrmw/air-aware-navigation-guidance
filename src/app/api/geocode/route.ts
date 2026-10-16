import { NextRequest } from 'next/server';
import { sendSuccess, sendError } from '@/lib/server/apiResponse';
import { searchGeocode } from '@/lib/services/geocodingService';

/**
 * Mencari saran lokasi geografis berdasarkan kata kunci pencarian.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q || q.trim().length < 3) {
    return sendError('VALIDATION_ERROR', 'Kata kunci pencarian minimal 3 karakter');
  }

  try {
    const results = await searchGeocode(q);
    return sendSuccess(results);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'digest' in err && String((err as { digest: unknown }).digest).startsWith('NEXT_')) {
      throw err;
    }
    console.error('[API Geocode] Error:', err);
    return sendError('UPSTREAM_ERROR', 'Gagal menghubungi penyedia peta geocoding');
  }
}
