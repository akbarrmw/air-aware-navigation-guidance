'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function SettingsPage() {
  const [exposureWeight, setExposureWeight] = useState(0.5);
  const [maxExtraTime, setMaxExtraTime] = useState(30);
  const [consent, setConsent] = useState(true);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2 text-emerald-400">Pengaturan & Privasi</h1>
        <p className="text-slate-400 text-sm mb-8">
          Kelola preferensi optimasi default rute dan persetujuan penyimpanan lokasi Anda.
        </p>

        <div className="space-y-6 bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div>
            <label className="block text-sm font-medium mb-1">
              Bobot Kualitas Udara Default: {exposureWeight}
            </label>
            <p className="text-xs text-slate-400 mb-2">
              0.0 = Selalu pilih waktu tercepat, 1.0 = Prioritas penuh rute udara terbersih.
            </p>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={exposureWeight}
              onChange={(e) => setExposureWeight(parseFloat(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Toleransi Tambahan Waktu Maksimal: +{maxExtraTime}%
            </label>
            <p className="text-xs text-slate-400 mb-2">
              Batas tambahan durasi perjalanan yang dapat Anda toleransi demi rute berpolusi lebih rendah.
            </p>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={maxExtraTime}
              onChange={(e) => setMaxExtraTime(parseInt(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-700 flex items-center justify-between">
            <div>
              <span className="block text-sm font-medium">Persetujuan Riwayat Perjalanan</span>
              <span className="text-xs text-slate-400">
                Izinkan sistem menyimpan snapshot lokasi dan estimasi perjalanan Anda.
              </span>
            </div>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="w-5 h-5 accent-emerald-500 rounded"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-between items-center">
          <Link href="/" className="text-sm text-slate-400 hover:underline">
            ← Kembali ke Beranda
          </Link>
          <button
            onClick={() => alert('Preferensi tersimpan.')}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded font-semibold text-sm transition"
          >
            Simpan Pengaturan
          </button>
        </div>
      </div>
    </div>
  );
}
