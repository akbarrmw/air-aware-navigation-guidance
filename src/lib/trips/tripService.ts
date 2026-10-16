/**
 * Layanan untuk persistensi dan pengelolaan riwayat perjalanan.
 */

import { createClient } from '@/lib/supabase/server';
import type { TripSavePayload, TripListItem, TripDetail } from '@/types/trips';
import type { TripRow } from '@/types/database';
import { AppError } from '@/lib/server/withApiHandler';
import { mapPayloadToRow, mapRowToListItem, mapRowToDetail } from './tripMapper';

export interface TripListResult {
  items: TripListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Menyimpan riwayat perjalanan baru ke basis data.
 */
export async function saveTrip(userId: string, payload: TripSavePayload): Promise<TripDetail> {
  const supabase = await createClient();

  // 1. Verifikasi status persetujuan penyimpanan riwayat (TC-19)
  const { data: profile, error: profError } = await supabase
    .from('profiles')
    .select('history_consent')
    .eq('user_id', userId)
    .single();

  if (profError || !profile) {
    throw new AppError(
      'NOT_FOUND',
      'Profil pengguna tidak ditemukan.',
      profError?.message,
      404
    );
  }

  if (!profile.history_consent) {
    throw new AppError(
      'CONSENT_REQUIRED',
      'Penyimpanan riwayat perjalanan ditolak. Harap berikan persetujuan penyimpanan riwayat pada halaman pengaturan terlebih dahulu.',
      { historyConsent: false },
      403
    );
  }

  // 2. Petakan payload ke baris database
  const insertData = mapPayloadToRow(userId, payload);

  // 3. Simpan ke database
  const { data: newRow, error: insertError } = await supabase
    .from('trips')
    .insert(insertData)
    .select()
    .single();

  if (insertError || !newRow) {
    throw new AppError(
      'INTERNAL_ERROR',
      'Gagal menyimpan data perjalanan ke basis data.',
      insertError?.message,
      500
    );
  }

  return mapRowToDetail(newRow as TripRow);
}

/**
 * Mengambil daftar riwayat perjalanan terpaginasi milik pengguna.
 */
export async function listTrips(
  userId: string,
  page = 1,
  pageSize = 10
): Promise<TripListResult> {
  const supabase = await createClient();

  const safePage = Math.max(1, page);
  const safePageSize = Math.min(50, Math.max(1, pageSize));
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  const { data, count, error } = await supabase
    .from('trips')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw new AppError(
      'INTERNAL_ERROR',
      'Gagal memuat daftar riwayat perjalanan.',
      error.message,
      500
    );
  }

  const rows = (data || []) as TripRow[];
  const total = count || 0;
  const totalPages = Math.ceil(total / safePageSize) || 1;

  return {
    items: rows.map(mapRowToListItem),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  };
}

/**
 * Mengambil data rincian satu riwayat perjalanan berdasarkan ID.
 */
export async function getTripById(userId: string, tripId: string): Promise<TripDetail> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new AppError(
      'NOT_FOUND',
      'Riwayat perjalanan tidak ditemukan atau Anda tidak memiliki akses.',
      error?.message,
      404
    );
  }

  return mapRowToDetail(data as TripRow);
}

/**
 * Menghapus satu entri riwayat perjalanan pengguna.
 */
export async function deleteTrip(userId: string, tripId: string): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('trip_id', tripId)
    .eq('user_id', userId);

  if (error) {
    throw new AppError(
      'INTERNAL_ERROR',
      'Gagal menghapus riwayat perjalanan.',
      error.message,
      500
    );
  }

  return {
    success: true,
    message: 'Riwayat perjalanan berhasil dihapus.',
  };
}

/**
 * Menghapus seluruh riwayat perjalanan milik pengguna.
 */
export async function deleteAllTrips(userId: string): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('user_id', userId);

  if (error) {
    throw new AppError(
      'INTERNAL_ERROR',
      'Gagal menghapus seluruh riwayat perjalanan.',
      error.message,
      500
    );
  }

  return {
    success: true,
    message: 'Seluruh riwayat perjalanan berhasil dihapus.',
  };
}
