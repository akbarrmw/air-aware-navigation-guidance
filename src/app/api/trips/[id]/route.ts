/**
 * @file route.ts
 * @description API Route handler untuk /api/trips/[id] (GET detail snapshot, DELETE item tunggal).
 * 
 * @author Person 3 (Database, Auth, & History Services)
 * @module app/api/trips/[id]/route
 * @see CODE_SPEC_AANG.md Bagian 8.1 & FR-11
 */

import { withApiHandler, AppError } from '@/lib/server/withApiHandler';
import { createClient } from '@/lib/supabase/server';
import type { TripDetail } from '@/types/trips';
import { getTripById, deleteTrip } from '@/lib/trips/tripService';

/**
 * GET /api/trips/[id]
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
 * DELETE /api/trips/[id]
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
