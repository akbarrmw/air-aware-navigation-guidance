'use client';

import React from 'react';
import Link from 'next/link';
import { RouteIcon, NavigationIcon } from '@/components/common/Icons';

export default function HistoryPage() {
  const sampleTrips = [
    {
      id: 'trip-1',
      route: 'Kampus Undip Tembalang → Simpang Lima, Semarang',
      date: 'Hari ini • 15:30 WIB',
      duration: '25 menit',
      distance: '10.8 km',
      saving: '↓ 46% paparan polusi',
      category: 'Sedang',
      aqi: 68,
      aqiColor: '#f59e0b',
    },
    {
      id: 'trip-2',
      route: 'Jakarta (Monas) → Bandung (Gedung Sate)',
      date: 'Kemarin • 08:15 WIB',
      duration: '2 jam 14 menit',
      distance: '152.4 km',
      saving: '↓ 38% paparan polusi',
      category: 'Sedang',
      aqi: 84,
      aqiColor: '#f59e0b',
    },
    {
      id: 'trip-3',
      route: 'Simpang Lima → Bandara Ahmad Yani',
      date: '12 Okt 2026 • 19:00 WIB',
      duration: '18 menit',
      distance: '8.4 km',
      saving: '↓ 31% paparan polusi',
      category: 'Baik',
      aqi: 42,
      aqiColor: '#10b981',
    },
  ];

  return (
    <div className="relative w-full min-h-[calc(100vh-56px)] mt-[56px] p-6 bg-slate-100 flex justify-center overflow-y-auto">
      <div className="w-full max-w-3xl">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Aktivitas Navigasi Anda
              </span>
              <h1 className="text-xl font-bold text-slate-900">Riwayat Perjalanan Bersih</h1>
            </div>
            <Link
              href="/routes"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <NavigationIcon size={14} />
              <span>Rencanakan Rute Baru</span>
            </Link>
          </div>

          {/* Cumulative Saved Stats Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[11px] text-emerald-800 font-semibold block">Total Paparan Dihemat</span>
              <strong className="text-lg font-bold text-emerald-950">~34%</strong>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-600 font-semibold block">Total Perjalanan Bersih</span>
              <strong className="text-lg font-bold text-slate-900">3 Rute</strong>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-600 font-semibold block">Jarak Terlindungi</span>
              <strong className="text-lg font-bold text-slate-900">171.6 km</strong>
            </div>
          </div>

          {/* Trip History List */}
          <div className="space-y-3">
            {sampleTrips.map((trip) => (
              <div
                key={trip.id}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-none">
                    <RouteIcon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="block text-sm font-bold text-slate-800 truncate">{trip.route}</strong>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                      <span>{trip.date}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-700">{trip.duration}</span>
                      <span>({trip.distance})</span>
                      <span>•</span>
                      <span
                        className="px-2 py-0.5 rounded-full text-white font-bold text-[10px] shadow-xs inline-flex items-center gap-1 whitespace-nowrap"
                        style={{ backgroundColor: trip.aqiColor }}
                      >
                        <span className="opacity-90">AQI</span>
                        <span>{trip.aqi}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold whitespace-nowrap flex-none">
                  {trip.saving}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
            🔒 Snapshot riwayat perjalanan dienkripsi secara lokal sesuai izin privasi Anda (PRD FR-11 &amp; FR-13).
          </div>
        </div>
      </div>
    </div>
  );
}
