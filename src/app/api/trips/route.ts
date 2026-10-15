/**
 * @file route.ts
 * @description API Route handler untuk /api/trips (GET daftar, POST simpan baru, DELETE bersihkan semua).
 * Dibungkus dengan withApiHandler untuk standardisasi validasi dan amplop ApiResponse.
 * 
 * @author Person 3 (Database, Auth, & History Services)
 * @module app/api/trips/route
 * @see CODE_SPEC_AANG.md Bagian 8.1 & FR-11, AC-13.1
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
 * GET /api/trips?page=1&pageSize=10
 * Mengambil daftar riwayat perjalanan terpaginasi milik pengguna aktif.
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
 * POST /api/trips
 * Menyimpan snapshot rute yang dipilih pengguna ke database.
 * Memerlukan persetujuan penyimpanan riwayat (history_consent = true).
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
 * DELETE /api/trips
 * Menghapus seluruh riwayat perjalanan pengguna aktif (AC-13.1).
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
