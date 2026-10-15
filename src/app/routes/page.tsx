'use client';

import React, { useState } from 'react';
import { ApiResponse } from '@/types/api';
import { AnalyzeRoutesResponseData } from '@/types/algorithms';

export default function RoutesPlanningPage() {
  const [origin, setOrigin] = useState('Kampus Undip Tembalang, Semarang');
  const [destination, setDestination] = useState('Simpang Lima, Semarang');
  const [exposureWeight, setExposureWeight] = useState(0.5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeRoutesResponseData | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/routes/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: { lat: -7.0514, lng: 110.4388 },
          destination: { lat: -6.9928, lng: 110.4222 },
          preferences: {
            exposureWeight,
            maxExtraTimePercent: 30,
          },
        }),
      });

      const json: ApiResponse<AnalyzeRoutesResponseData> = await res.json();
      if (json.success && json.data) {
        setResult(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-8 px-4 max-w-7xl mx-auto text-slate-100">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-emerald-400">Perencanaan Rute & Trade-Off Polusi</h1>
        <p className="text-slate-400 text-sm">
          Bandingkan alternatif rute berdasarkan waktu tempuh dan estimasi akumulasi paparan PM2.5.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit">
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div>
              <label className="block text-xs uppercase font-bold text-slate-400 mb-1">
                Titik Asal
              </label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-bold text-slate-400 mb-1">
                Titik Tujuan
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-2">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs uppercase font-bold text-slate-400">
                  Preferensi Optimasi
                </label>
                <span className="text-xs text-emerald-400 font-bold">
                  {exposureWeight === 0
                    ? 'Tercepat'
                    : exposureWeight === 0.8
                    ? 'Udara Bersih'
                    : 'Seimbang'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={exposureWeight}
                onChange={(e) => setExposureWeight(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0.0 Tercepat</span>
                <span>0.5 Seimbang</span>
                <span>1.0 Udara Bersih</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-emerald-500/20 text-sm mt-4"
            >
              {loading ? 'Menganalisis Rute...' : 'Analisis Rute & Polusi 🚀'}
            </button>
          </form>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <>
              {/* Recommendation Card */}
              <div className="p-6 bg-emerald-950/40 border border-emerald-500/50 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-3 py-1 bg-emerald-500 text-slate-950 font-bold text-xs rounded-full uppercase tracking-wider">
                    Rekomendasi Sistem: Rute {result.recommendedRouteLabel}
                  </span>
                </div>
                <p className="text-emerald-200 text-base font-semibold mb-4">
                  {result.explanation.text}
                </p>

                {/* Action Rules */}
                <div className="space-y-2">
                  {result.actionMessages.map((msg) => (
                    <div
                      key={msg.ruleId}
                      className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-xs"
                    >
                      <strong className="text-emerald-400 block mb-0.5">{msg.message}</strong>
                      <span className="text-slate-400">{msg.basis}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comparison Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 font-bold text-sm">
                  Tabel Perbandingan Alternatif Rute
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950 text-xs text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="p-3">Rute</th>
                        <th className="p-3">Waktu</th>
                        <th className="p-3">Jarak</th>
                        <th className="p-3">Estimasi EI</th>
                        <th className="p-3">Kategori</th>
                        <th className="p-3">Keyakinan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {result.routes.map((r) => (
                        <tr
                          key={r.id}
                          className={
                            r.label === result.recommendedRouteLabel
                              ? 'bg-emerald-500/10'
                              : 'hover:bg-slate-800/40'
                          }
                        >
                          <td className="p-3 font-bold text-emerald-400">Rute {r.label}</td>
                          <td className="p-3">
                            {Math.round(r.durationSeconds / 60)} mnt
                            {r.comparison.extraSeconds > 0 && (
                              <span className="text-xs text-slate-400 ml-1">
                                (+{Math.round(r.comparison.extraSeconds / 60)} mnt)
                              </span>
                            )}
                          </td>
                          <td className="p-3">{(r.distanceMeters / 1000).toFixed(1)} km</td>
                          <td className="p-3 font-semibold">
                            {r.estimate.exposureIndexPm25 ?? '-'} µg/m³·mnt
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-xs bg-slate-800 border border-slate-700">
                              {r.estimate.category}
                            </span>
                          </td>
                          <td className="p-3 text-xs capitalize text-slate-300">
                            {r.estimate.confidenceLevel}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="p-4 bg-slate-900/50 border border-slate-800/60 rounded-xl text-xs text-slate-400 text-center">
                ⚠️ {result.disclaimer}
              </div>
            </>
          ) : (
            <div className="p-12 bg-slate-900/40 border border-slate-800 rounded-2xl text-center text-slate-500">
              Silakan tekan tombol <strong>&quot;Analisis Rute &amp; Polusi&quot;</strong> untuk melihat perbandingan trade-off alternatif rute.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
