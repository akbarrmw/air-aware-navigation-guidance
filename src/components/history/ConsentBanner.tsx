/**
 * Komponen banner status persetujuan penyimpanan riwayat perjalanan.
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ConsentBannerProps {
  hasConsent: boolean;
  onConsentUpdated?: () => void;
}

export function ConsentBanner({ hasConsent, onConsentUpdated }: ConsentBannerProps) {
  const [updating, setUpdating] = useState(false);
  const [activeConsent, setActiveConsent] = useState(hasConsent);

  if (activeConsent) {
    return null;
  }

  const handleEnableConsent = async () => {
    setUpdating(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          history_consent: true,
          consent_updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (!error) {
        setActiveConsent(true);
        if (onConsentUpdated) {
          onConsentUpdated();
        }
      }
    } catch (err) {
      console.error('[ConsentBanner] Gagal mengaktifkan consent:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 sm:p-5 mb-8 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-700 mt-0.5 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
              <span>Penyimpanan Riwayat Dinonaktifkan</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            </h3>
            <p className="text-xs text-amber-900/80 mt-0.5 leading-relaxed max-w-xl">
              AANG menjaga privasi Anda dengan ketat. Riwayat rute dan analisis paparan hanya akan
              disimpan ke akun Anda setelah Anda memberikan izin secara eksplisit.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            href="/settings"
            className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline underline-offset-4 px-2 py-1.5"
          >
            Pelajari Privasi
          </Link>
          <button
            type="button"
            onClick={handleEnableConsent}
            disabled={updating}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition shadow-sm"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{updating ? 'Menyimpan...' : 'Aktifkan Izin'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
