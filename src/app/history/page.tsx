'use client';

import React from 'react';
import Link from 'next/link';

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-emerald-400">Riwayat Perjalanan</h1>
            <p className="text-slate-400 text-sm">
              Daftar rute perjalanan tersimpan dan estimasi akumulasi paparan PM2.5.
            </p>
          </div>
          <Link
            href="/routes"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-semibold transition"
          >
            + Rencanakan Rute Baru
          </Link>
        </div>

        {/* Empty State */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-12 text-center">
          <div className="w-12 h-12 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            📍
          </div>
          <h3 className="text-lg font-semibold mb-1">Belum Ada Perjalanan Tersimpan</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
            Lakukan analisis perjalanan di halaman Perencanaan Rute, lalu klik tombol &quot;Simpan Perjalanan&quot; untuk mencatat snapshot estimasi di sini.
          </p>
          <Link
            href="/routes"
            className="inline-block px-5 py-2.5 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium transition"
          >
            Mulai Analisis Rute
          </Link>
        </div>
      </div>
    </div>
  );
}
