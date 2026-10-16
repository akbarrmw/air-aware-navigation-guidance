/**
 * API Route handler untuk detail dan penghapusan riwayat perjalanan spesifik (/api/trips/[id]).
 */

import { withApiHandler, AppError } from '@/lib/server/withApiHandler';
import { createClient } from '@/lib/supabase/server';
import type { TripDetail } from '@/types/trips';
import { getTripById, deleteTrip } from '@/lib/trips/tripService';

/**
 * Mengambil detail snapshot lengkap perjalanan berdasarkan ID.
 */
export const GET = withApiHandler<TripDetail>(
  async ({ params }) => {
    const tripId = typeof params?.id === 'string' ? params.id : undefined;
    if (!tripId) {
      throw new AppError('VALIDATION_ERROR', 'ID riwayat perjalanan wajib disertakan.', undefined, 400);
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AppError('UNAUTHENTICATED', 'Silakan masuk terlebih dahulu.', undefined, 401);
    }

    const trip = await getTripById(user.id, tripId);
    return trip;
  }
);

/**
 * Menghapus satu item riwayat perjalanan.
 */
export const DELETE = withApiHandler<{ success: boolean; message: string }>(
  async ({ params }) => {
    const tripId = typeof params?.id === 'string' ? params.id : undefined;
    if (!tripId) {
      throw new AppError('VALIDATION_ERROR', 'ID riwayat perjalanan wajib disertakan.', undefined, 400);
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AppError('UNAUTHENTICATED', 'Silakan masuk terlebih dahulu.', undefined, 401);
    }

    const result = await deleteTrip(user.id, tripId);
    return result;
  }
);
