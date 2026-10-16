/**
 * @file ConsentBanner.tsx
 * @description Komponen notifikasi status persetujuan penyimpanan riwayat perjalanan (Consent Banner).
 * Memudahkan pengguna mengaktifkan penyimpanan riwayat sesuai prinsip transparansi PRD.
 * 
 * @author Person 3 (Database, Auth, & History Services)
 * @module components/history/ConsentBanner
 * @see CODE_SPEC_AANG.md Bagian 8.1 & PRD Consent Specification
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
    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-4 sm:p-5 mb-8 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 mt-0.5">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
              <span>Penyimpanan Riwayat Dinonaktifkan</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </h3>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed max-w-xl">
              AANG menjaga privasi Anda dengan ketat. Riwayat rute dan analisis paparan hanya akan
              disimpan ke akun Anda setelah Anda memberikan izin secara eksplisit.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            href="/settings"
            className="text-xs text-slate-400 hover:text-white underline underline-offset-4 px-2 py-1.5"
          >
            Pelajari Privasi
          </Link>
          <button
            type="button"
            onClick={handleEnableConsent}
            disabled={updating}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-amber-500/10"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{updating ? 'Menyimpan...' : 'Aktifkan Izin'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
