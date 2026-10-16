/**
 * Modul klien API untuk pemanggilan endpoint riwayat perjalanan (/api/trips).
 */

import type { ApiResponse } from '@/types/api';
import type { TripSavePayload, TripDetail } from '@/types/trips';
import type { TripListResult } from '@/lib/trips/tripService';

/**
 * Menyimpan snapshot perjalanan yang dipilih ke riwayat pengguna.
 */
export async function saveTripToHistory(
  payload: TripSavePayload
): Promise<ApiResponse<TripDetail>> {
  const response = await fetch('/api/trips', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = (await response.json()) as ApiResponse<TripDetail>;
  return json;
}

/**
 * Mengambil daftar riwayat perjalanan terpaginasi.
 */
export async function fetchTripsList(
  page = 1,
  pageSize = 10
): Promise<ApiResponse<TripListResult>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  const response = await fetch(`/api/trips?${params.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const json = (await response.json()) as ApiResponse<TripListResult>;
  return json;
}

/**
 * Mengambil detail perjalanan berdasarkan ID.
 */
export async function fetchTripDetail(
  tripId: string
): Promise<ApiResponse<TripDetail>> {
  const response = await fetch(`/api/trips/${tripId}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const json = (await response.json()) as ApiResponse<TripDetail>;
  return json;
}

/**
 * Menghapus satu item riwayat perjalanan.
 */
export async function deleteTripItem(
  tripId: string
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  const response = await fetch(`/api/trips/${tripId}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
  });

  const json = (await response.json()) as ApiResponse<{ success: boolean; message: string }>;
  return json;
}

/**
 * Menghapus seluruh riwayat perjalanan pengguna.
 */
export async function clearAllTripsHistory(): Promise<
  ApiResponse<{ success: boolean; message: string }>
> {
  const response = await fetch('/api/trips', {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
  });

  const json = (await response.json()) as ApiResponse<{ success: boolean; message: string }>;
  return json;
}
