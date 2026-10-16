/**
 * @file accountApi.ts
 * @description Modul klien API ter-type aman untuk preferensi pengguna, konsensus privasi, dan penghapusan akun.
 * 
 * @author Person 3 (Database, Auth, & History Services)
 * @module lib/client/accountApi
 * @see CODE_SPEC_AANG.md Bagian 8.1
 */

import type { ApiResponse } from '@/types/api';
import type { PreferencesPayload } from '@/types/trips';
import type { PreferencesPayloadInput } from '@/types/schemas';

/**
 * Mengambil preferensi rute dan status konsensus privasi pengguna aktif.
 */
export async function fetchUserPreferences(): Promise<ApiResponse<PreferencesPayload>> {
  const response = await fetch('/api/preferences', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const json = (await response.json()) as ApiResponse<PreferencesPayload>;
  return json;
}

/**
 * Memperbarui nilai preferensi bobot rute dan konsensus.
 */
export async function updateUserPreferences(
  payload: PreferencesPayloadInput
): Promise<ApiResponse<PreferencesPayload>> {
  const response = await fetch('/api/preferences', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = (await response.json()) as ApiResponse<PreferencesPayload>;
  return json;
}

/**
 * Memperbarui secara instan status toggle persetujuan penyimpanan riwayat.
 */
export async function updateHistoryConsent(
  historyConsent: boolean
): Promise<ApiResponse<{ historyConsent: boolean; consentUpdatedAt: string }>> {
  const response = await fetch('/api/account/consent', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ historyConsent }),
  });

  const json = (await response.json()) as ApiResponse<{
    historyConsent: boolean;
    consentUpdatedAt: string;
  }>;
  return json;
}

/**
 * Menghapus akun pengguna secara permanen setelah verifikasi kata sandi (TC-23).
 */
export async function deleteUserAccount(
  password: string
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  const response = await fetch('/api/account', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ password }),
  });

  const json = (await response.json()) as ApiResponse<{
    success: boolean;
    message: string;
  }>;
  return json;
}
