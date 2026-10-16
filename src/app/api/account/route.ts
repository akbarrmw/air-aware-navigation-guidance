/**
 * @file route.ts
 * @description API Route handler untuk /api/account (DELETE akun pengguna permanen via Service Role Key).
 * Memverifikasi kata sandi pengguna sebelum eksekusi penghapusan tuntas berjenjang (TC-23).
 * 
 * @author Person 3 (Database, Auth, & History Services)
 * @module app/api/account/route
 * @see CODE_SPEC_AANG.md Bagian 8.1 & TC-23, K-P3.2
 */

import { withApiHandler, AppError } from '@/lib/server/withApiHandler';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  DeleteAccountPayloadSchema,
  type DeleteAccountPayloadInput,
} from '@/types/schemas';

/**
 * DELETE /api/account
 * Menghapus akun pengguna permanen beserta baris profiles dan seluruh trips (Cascade Delete).
 */
export const DELETE = withApiHandler<{ success: boolean; message: string }, DeleteAccountPayloadInput>(
  async ({ body }) => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
      throw new AppError(
        'UNAUTHENTICATED',
        'Silakan masuk terlebih dahulu untuk memproses penghapusan akun.',
        undefined,
        401
      );
    }

    // 1. Verifikasi kata sandi pengguna demi keamanan akun
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: body.password,
    });

    if (verifyError) {
      throw new AppError(
        'FORBIDDEN',
        'Kata sandi verifikasi tidak valid. Penghapusan akun dibatalkan.',
        undefined,
        403
      );
    }

    // 2. Eksekusi penghapusan permanen dari auth.users via Admin Client (K-P3.2 & TC-23)
    const adminSupabase = createAdminClient();
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(user.id);

    if (deleteError) {
      throw new AppError(
        'INTERNAL_ERROR',
        'Gagal menghapus akun pengguna dari sistem basis data.',
        deleteError.message,
        500
      );
    }

    // 3. Keluarkan dari sesi
    await supabase.auth.signOut();

    return {
      success: true,
      message: 'Akun AANG dan seluruh riwayat perjalanan Anda telah berhasil dihapus secara permanen.',
    };
  },
  { bodySchema: DeleteAccountPayloadSchema }
);
