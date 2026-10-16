/**
 * API Route handler untuk preferensi rute dan privasi pengguna (/api/preferences).
 */

import { withApiHandler, AppError } from '@/lib/server/withApiHandler';
import { createClient } from '@/lib/supabase/server';
import {
  PreferencesPayloadSchema,
  type PreferencesPayloadInput,
} from '@/types/schemas';
import type { PreferencesPayload } from '@/types/trips';

/**
 * Mengambil preferensi rute dan status privasi pengguna aktif.
 */
export const GET = withApiHandler<PreferencesPayload>(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(
      'UNAUTHENTICATED',
      'Silakan masuk terlebih dahulu untuk mengakses preferensi akun.',
      undefined,
      401
    );
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('exposure_weight, max_extra_time_percent, history_consent')
    .eq('user_id', user.id)
    .single();

  if (error || !profile) {
    throw new AppError(
      'NOT_FOUND',
      'Profil preferensi tidak ditemukan.',
      error?.message,
      404
    );
  }

  return {
    exposureWeight: Number(profile.exposure_weight),
    maxExtraTimePercent: profile.max_extra_time_percent,
    historyConsent: Boolean(profile.history_consent),
  };
});

/**
 * Memperbarui preferensi rute dan status privasi pengguna aktif.
 */
export const PUT = withApiHandler<PreferencesPayload, PreferencesPayloadInput>(
  async ({ body }) => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AppError(
        'UNAUTHENTICATED',
        'Silakan masuk terlebih dahulu untuk memperbarui preferensi akun.',
        undefined,
        401
      );
    }

    const updatePayload = {
      exposure_weight: body.exposureWeight,
      max_extra_time_percent: body.maxExtraTimePercent,
      history_consent: body.historyConsent,
      consent_updated_at: new Date().toISOString(),
    };

    const { data: updated, error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('user_id', user.id)
      .select('exposure_weight, max_extra_time_percent, history_consent')
      .single();

    if (error || !updated) {
      throw new AppError(
        'INTERNAL_ERROR',
        'Gagal memperbarui preferensi akun.',
        error?.message,
        500
      );
    }

    return {
      exposureWeight: Number(updated.exposure_weight),
      maxExtraTimePercent: updated.max_extra_time_percent,
      historyConsent: Boolean(updated.history_consent),
    };
  },
  { bodySchema: PreferencesPayloadSchema }
);
