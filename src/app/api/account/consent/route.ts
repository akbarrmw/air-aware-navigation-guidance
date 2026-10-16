/**
 * @file route.ts
 * @description API Route handler untuk /api/account/consent (PATCH toggle persetujuan riwayat).
 * 
 * @author Person 3 (Database, Auth, & History Services)
 * @module app/api/account/consent/route
 * @see CODE_SPEC_AANG.md Bagian 8.1 & PRD Consent Specification
 */

import { withApiHandler, AppError } from '@/lib/server/withApiHandler';
import { createClient } from '@/lib/supabase/server';
import { ConsentPayloadSchema, type ConsentPayloadInput } from '@/types/schemas';

interface ConsentResponse {
  historyConsent: boolean;
  consentUpdatedAt: string;
}

/**
 * PATCH /api/account/consent
 * Memperbarui status persetujuan penyimpanan data lokasi dan riwayat perjalanan.
 */
export const PATCH = withApiHandler<ConsentResponse, ConsentPayloadInput>(
  async ({ body }) => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AppError(
        'UNAUTHENTICATED',
        'Silakan masuk terlebih dahulu untuk mengubah status persetujuan.',
        undefined,
        401
      );
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('profiles')
      .update({
        history_consent: body.historyConsent,
        consent_updated_at: now,
      })
      .eq('user_id', user.id)
      .select('history_consent, consent_updated_at')
      .single();

    if (error || !data) {
      throw new AppError(
        'INTERNAL_ERROR',
        'Gagal memperbarui status persetujuan riwayat.',
        error?.message,
        500
      );
    }

    return {
      historyConsent: data.history_consent,
      consentUpdatedAt: data.consent_updated_at || now,
    };
  },
  { bodySchema: ConsentPayloadSchema }
);
