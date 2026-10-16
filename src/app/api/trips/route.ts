/**
 * API Route handler untuk daftar dan pengelolaan riwayat perjalanan (/api/trips).
 */

import { withApiHandler, AppError } from '@/lib/server/withApiHandler';
import { createClient } from '@/lib/supabase/server';
import {
  TripSavePayloadSchema,
  TripListQuerySchema,
  type TripSavePayloadInput,
  type TripListQueryInput,
} from '@/types/schemas';
import type { TripDetail, TripSavePayload } from '@/types/trips';
import {
  saveTrip,
  listTrips,
  deleteAllTrips,
  type TripListResult,
} from '@/lib/trips/tripService';

/**
 * Mengambil daftar riwayat perjalanan terpaginasi milik pengguna.
 */
export const GET = withApiHandler<TripListResult, unknown, TripListQueryInput>(
  async ({ query }) => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AppError(
        'UNAUTHENTICATED',
        'Silakan masuk terlebih dahulu untuk mengakses riwayat perjalanan.',
        undefined,
        401
      );
    }

    const result = await listTrips(user.id, query.page, query.pageSize);
    return {
      data: result,
      options: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
      },
    };
  },
  { querySchema: TripListQuerySchema }
);

/**
 * Menyimpan snapshot rute yang dipilih pengguna ke database.
 */
export const POST = withApiHandler<TripDetail, TripSavePayloadInput>(
  async ({ body }) => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AppError(
        'UNAUTHENTICATED',
        'Silakan masuk terlebih dahulu untuk menyimpan perjalanan.',
        undefined,
        401
      );
    }

    const savedTrip = await saveTrip(user.id, body as unknown as TripSavePayload);
    return {
      data: savedTrip,
      status: 201,
    };
  },
  { bodySchema: TripSavePayloadSchema }
);

/**
 * Menghapus seluruh riwayat perjalanan milik pengguna.
 */
export const DELETE = withApiHandler<{ success: boolean; message: string }>(
  async () => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AppError(
        'UNAUTHENTICATED',
        'Silakan masuk terlebih dahulu.',
        undefined,
        401
      );
    }

    const result = await deleteAllTrips(user.id);
    return result;
  }
);
