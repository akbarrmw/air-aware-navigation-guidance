/**
 * @file page.tsx
 * @description Halaman Detail Snapshot Riwayat Perjalanan P-06 untuk AANG.
 * Menampilkan ringkasan komparasi paparan, stasiun yang digunakan, dan segmen kontributor polusi.
 * 
 * @author Person 3 (Database, Auth, & History Services)
 * @module app/history/[id]/page
 * @see CODE_SPEC_AANG.md Bagian 8.1 & FR-11
 */

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Navigation,
  Wind,
  ShieldCheck,
  TrendingDown,
  Activity,
  Layers,
  Trash2,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import { fetchTripDetail, deleteTripItem } from '@/lib/client/tripsApi';
import type { TripDetail } from '@/types/trips';
import type { AqiCategoryCode } from '@/types/aqiScale';

function getCategoryBadge(category: AqiCategoryCode | null) {
  switch (category) {
    case 'good':
      return { label: 'Baik', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' };
    case 'moderate':
      return { label: 'Sedang', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' };
    case 'unhealthySensitive':
      return { label: 'Sensitif', color: 'bg-orange-500/20 text-orange-400 border-orange-500/40' };
    case 'unhealthy':
      return { label: 'Tidak Sehat', color: 'bg-rose-500/20 text-rose-400 border-rose-500/40' };
    case 'veryUnhealthy':
      return { label: 'Sangat Buruk', color: 'bg-purple-500/20 text-purple-400 border-purple-500/40' };
    case 'hazardous':
      return { label: 'Berbahaya', color: 'bg-red-950/40 text-red-400 border-red-700/60' };
    default:
      return { label: 'Tanpa Data', color: 'bg-slate-800 text-slate-400 border-slate-700' };
  }
}

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = typeof params?.id === 'string' ? params.id : '';

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!tripId) return;

    async function loadDetail() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const res = await fetchTripDetail(tripId);
        if (res.success && res.data) {
          setTrip(res.data);
        } else {
          setErrorMessage(res.error?.message || 'Riwayat perjalanan tidak ditemukan.');
        }
      } catch (err) {
        console.error('[TripDetailPage] Error:', err);
        setErrorMessage('Gagal memuat rincian perjalanan.');
      } finally {
        setLoading(false);
      }
    }

    loadDetail();
  }, [tripId]);

  const handleDelete = async () => {
    if (!trip) return;
    const confirm = window.confirm('Hapus snapshot riwayat perjalanan ini secara permanen?');
    if (!confirm) return;

    setIsDeleting(true);
    try {
      const res = await deleteTripItem(trip.tripId);
      if (res.success) {
        router.push('/history');
      } else {
        alert(res.error?.message || 'Gagal menghapus riwayat.');
      }
    } catch {
      alert('Terjadi kesalahan saat menghubungi server.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <RotateCw className="w-5 h-5 animate-spin text-emerald-500" />
          <span>Memuat detail snapshot perjalanan...</span>
        </div>
      </div>
    );
  }

  if (errorMessage || !trip) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="p-4 bg-rose-950/60 border border-rose-800 rounded-2xl text-rose-300 text-sm mb-6 flex items-center justify-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
          <span>{errorMessage || 'Data perjalanan tidak tersedia.'}</span>
        </div>
        <Link
          href="/history"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Riwayat</span>
        </Link>
      </div>
    );
  }

  const categoryBadge = getCategoryBadge(trip.category);
  const distanceKm = (trip.distanceMeters / 1000).toFixed(2);
  const minutes = Math.round(trip.durationSeconds / 60);

  // Komparasi terhadap rute tercepat
  const fastestMinutes = Math.round(trip.fastest.durationSeconds / 60);
  const extraSeconds = Math.max(0, trip.durationSeconds - trip.fastest.durationSeconds);
  const extraMinutes = Math.round(extraSeconds / 60);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          href="/history"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Riwayat</span>
        </Link>

        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{isDeleting ? 'Menghapus...' : 'Hapus Snapshot'}</span>
        </button>
      </div>

      {/* Snapshot Header Box */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl mb-8 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-6 border-b border-slate-800/80">
          <div>
            <span className="text-[11px] font-bold tracking-wider text-emerald-400 uppercase block mb-1">
              Snapshot Terverifikasi
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Rincian Perjalanan
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {new Date(trip.analyzedAt).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${categoryBadge.color}`}
            >
              {categoryBadge.label}
            </span>
            {trip.wasRecommended && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Pilihan Bersih
              </span>
            )}
          </div>
        </div>

        {/* Origin & Destination Nodes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Titik Keberangkatan</span>
            </div>
            <p className="text-sm font-semibold text-white mb-1">{trip.originLabel}</p>
            <span className="text-[11px] text-slate-500 font-mono">
              [{trip.origin.lat.toFixed(5)}, {trip.origin.lng.toFixed(5)}]
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">
              <div className="w-2 h-2 rounded-full bg-rose-400" />
              <span>Titik Kedatangan</span>
            </div>
            <p className="text-sm font-semibold text-white mb-1">{trip.destinationLabel}</p>
            <span className="text-[11px] text-slate-500 font-mono">
              [{trip.destination.lat.toFixed(5)}, {trip.destination.lng.toFixed(5)}]
            </span>
          </div>
        </div>

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80 text-center">
            <span className="block text-[10px] text-slate-500 uppercase font-semibold">
              Total Jarak
            </span>
            <span className="text-base font-extrabold text-white mt-1 flex items-center justify-center gap-1.5">
              <Navigation className="w-4 h-4 text-emerald-400" />
              {distanceKm} km
            </span>
          </div>

          <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80 text-center">
            <span className="block text-[10px] text-slate-500 uppercase font-semibold">
              Waktu Tempuh
            </span>
            <span className="text-base font-extrabold text-white mt-1 flex items-center justify-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              {minutes} mnt
            </span>
          </div>

          <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80 text-center">
            <span className="block text-[10px] text-slate-500 uppercase font-semibold">
              PM2.5 Rata-rata
            </span>
            <span className="text-base font-extrabold text-white mt-1 flex items-center justify-center gap-1.5">
              <Wind className="w-4 h-4 text-teal-400" />
              {trip.avgPm25 !== null ? `${trip.avgPm25.toFixed(1)}` : 'N/A'}{' '}
              <span className="text-[10px] text-slate-400 font-normal">µg/m³</span>
            </span>
          </div>

          <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80 text-center">
            <span className="block text-[10px] text-slate-500 uppercase font-semibold">
              Cakupan Stasiun
            </span>
            <span className="text-base font-extrabold text-white mt-1 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              {trip.coverageRatio !== null
                ? `${Math.round(trip.coverageRatio * 100)}%`
                : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Comparison against Fastest Route Section */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 mb-8 backdrop-blur-md">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-emerald-400" />
          <span>Perbandingan Terhadap Rute Tercepat Saat Analisis</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
            <span className="text-xs text-slate-400 block mb-1">Durasi Rute Tercepat</span>
            <p className="text-sm font-bold text-white">
              {fastestMinutes} menit{' '}
              {extraMinutes > 0 && (
                <span className="text-xs font-normal text-amber-400">
                  (+{extraMinutes} menit ekstra untuk udara lebih bersih)
                </span>
              )}
            </p>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
            <span className="text-xs text-slate-400 block mb-1">
              Paparan PM2.5 Rute Tercepat
            </span>
            <p className="text-sm font-bold text-white">
              {trip.fastest.exposureIndexPm25 !== null
                ? `${trip.fastest.exposureIndexPm25.toFixed(1)} µg/m³`
                : 'Tidak tersedia'}
            </p>
          </div>
        </div>
      </div>

      {/* Top Contributor Segments if available */}
      {trip.estimate?.topContributors && trip.estimate.topContributors.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 mb-8 backdrop-blur-md">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <span>Segmen Kontributor Polusi Tertinggi</span>
          </h2>

          <div className="space-y-2.5">
            {trip.estimate.topContributors.map((contrib, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="text-slate-300 font-medium">
                    Segmen #{contrib.segmentIndex + 1}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <span className="text-slate-400">
                    PM2.5:{' '}
                    <strong className="text-white">
                      {contrib.pm25 !== null ? `${contrib.pm25.toFixed(1)} µg/m³` : 'N/A'}
                    </strong>
                  </span>
                  <span className="text-amber-400 font-bold">
                    {contrib.contributionPercent !== null
                      ? `${contrib.contributionPercent.toFixed(1)}%`
                      : '0%'}{' '}
                    kontribusi
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata & Audit Footer */}
      <div className="p-4 bg-slate-950/40 border border-slate-800/60 rounded-2xl text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5" />
          <span>Versi Algoritma: <strong>{trip.algorithmVersion}</strong></span>
        </div>

        <div>
          <span>Sumber Data Polusi: <strong>{trip.dataSource}</strong></span>
        </div>

        <div>
          <span>Bobot Eksposur Terpakai: <strong>{trip.usedExposureWeight}</strong></span>
        </div>
      </div>
    </div>
  );
}
