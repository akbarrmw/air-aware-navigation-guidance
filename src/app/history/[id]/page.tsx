/**
 * @file page.tsx
 * @description Halaman Detail Snapshot Riwayat Perjalanan P-06 untuk AANG.
 * Menampilkan ringkasan komparasi paparan, stasiun yang digunakan, dan segmen kontributor polusi.
 * 
 * @author Person 3 (Database, Auth, & History Services) / Refactored for clean light theme
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
  Car,
  Bike,
  Footprints,
} from 'lucide-react';
import { fetchTripDetail, deleteTripItem } from '@/lib/client/tripsApi';
import type { TripDetail } from '@/types/trips';
import type { AqiCategoryCode } from '@/types/aqiScale';

function getCategoryBadge(category: AqiCategoryCode | null) {
  switch (category) {
    case 'good':
      return { label: 'Baik', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    case 'moderate':
      return { label: 'Sedang', color: 'bg-yellow-50 text-yellow-800 border-yellow-200' };
    case 'unhealthySensitive':
      return { label: 'Sensitif', color: 'bg-orange-50 text-orange-800 border-orange-200' };
    case 'unhealthy':
      return { label: 'Tidak Sehat', color: 'bg-rose-50 text-rose-800 border-rose-200' };
    case 'veryUnhealthy':
      return { label: 'Sangat Buruk', color: 'bg-purple-50 text-purple-800 border-purple-200' };
    case 'hazardous':
      return { label: 'Berbahaya', color: 'bg-red-100 text-red-900 border-red-300' };
    default:
      return { label: 'Tanpa Data', color: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
}

function renderTransportModeBadge(mode?: 'car' | 'motorcycle' | 'walk') {
  switch (mode) {
    case 'motorcycle':
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 bg-amber-50 text-amber-800 border-amber-200">
          <Bike className="w-3.5 h-3.5" />
          <span>Sepeda Motor</span>
        </span>
      );
    case 'walk':
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 bg-blue-50 text-blue-800 border-blue-200">
          <Footprints className="w-3.5 h-3.5" />
          <span>Jalan Kaki</span>
        </span>
      );
    case 'car':
    default:
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 bg-slate-100 text-slate-800 border-slate-200">
          <Car className="w-3.5 h-3.5" />
          <span>Mobil</span>
        </span>
      );
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
          setErrorMessage(res.error?.message || 'Detail perjalanan tidak ditemukan.');
        }
      } catch (err) {
        console.error('[TripDetailPage] Error loadDetail:', err);
        setErrorMessage('Gagal memuat detail perjalanan dari server.');
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
    } catch (err) {
      console.error('[TripDetailPage] Gagal hapus:', err);
      alert('Terjadi kendala saat menghapus.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-[calc(100vh-56px)] mt-[56px] flex items-center justify-center p-6 bg-slate-100">
        <div className="flex items-center gap-3 text-slate-600 text-sm">
          <RotateCw className="w-5 h-5 animate-spin text-emerald-600" />
          <span>Memuat rincian snapshot perjalanan...</span>
        </div>
      </div>
    );
  }

  if (errorMessage || !trip) {
    return (
      <div className="w-full h-[calc(100vh-56px)] mt-[56px] flex flex-col items-center justify-center p-6 bg-slate-100 text-center">
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Snapshot Tidak Ditemukan</h2>
        <p className="text-slate-600 text-xs sm:text-sm max-w-sm mb-6">
          {errorMessage || 'Catatan perjalanan yang Anda cari tidak tersedia atau telah dihapus.'}
        </p>
        <Link
          href="/history"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition shadow-sm"
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
    <div className="w-full h-[calc(100vh-56px)] mt-[56px] overflow-y-auto bg-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto pb-12">
        {/* Navigation Top Bar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            href="/history"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Riwayat</span>
          </Link>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition disabled:opacity-50 shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? 'Menghapus...' : 'Hapus Snapshot'}</span>
          </button>
        </div>

        {/* Snapshot Header Box */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 mb-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-6 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-bold tracking-wider text-emerald-700 uppercase block mb-1">
                Snapshot Terverifikasi
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                Rincian Perjalanan
              </h1>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
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

            <div className="flex items-center gap-2 flex-wrap">
              {renderTransportModeBadge(trip.transportMode)}
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${categoryBadge.color}`}
              >
                {categoryBadge.label}
              </span>
              {trip.wasRecommended && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Pilihan Bersih
                </span>
              )}
            </div>
          </div>

          {/* Origin & Destination Nodes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>Titik Keberangkatan</span>
              </div>
              <p className="text-sm font-bold text-slate-900 mb-1">{trip.originLabel}</p>
              <span className="text-[11px] text-slate-500 font-mono">
                [{trip.origin.lat.toFixed(5)}, {trip.origin.lng.toFixed(5)}]
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-700 uppercase tracking-wider mb-1">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Titik Kedatangan</span>
              </div>
              <p className="text-sm font-bold text-slate-900 mb-1">{trip.destinationLabel}</p>
              <span className="text-[11px] text-slate-500 font-mono">
                [{trip.destination.lat.toFixed(5)}, {trip.destination.lng.toFixed(5)}]
              </span>
            </div>
          </div>

          {/* Primary Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
              <span className="block text-[10px] text-slate-500 uppercase font-bold">
                Total Jarak
              </span>
              <span className="text-base font-extrabold text-slate-900 mt-1 flex items-center justify-center gap-1.5">
                <Navigation className="w-4 h-4 text-emerald-600" />
                {distanceKm} km
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
              <span className="block text-[10px] text-slate-500 uppercase font-bold">
                Waktu Tempuh
              </span>
              <span className="text-base font-extrabold text-slate-900 mt-1 flex items-center justify-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                {minutes} mnt
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
              <span className="block text-[10px] text-slate-500 uppercase font-bold">
                PM2.5 Rata-rata
              </span>
              <span className="text-base font-extrabold text-slate-900 mt-1 flex items-center justify-center gap-1.5">
                <Wind className="w-4 h-4 text-teal-600" />
                {trip.avgPm25 !== null ? `${trip.avgPm25.toFixed(1)}` : 'N/A'}{' '}
                <span className="text-[10px] text-slate-500 font-normal">µg/m³</span>
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
              <span className="block text-[10px] text-slate-500 uppercase font-bold">
                Cakupan Stasiun
              </span>
              <span className="text-base font-extrabold text-slate-900 mt-1 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                {trip.coverageRatio !== null
                  ? `${Math.round(trip.coverageRatio * 100)}%`
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Comparison against Fastest Route Section */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 mb-8 shadow-sm">
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-emerald-600" />
            <span>Perbandingan Terhadap Rute Tercepat Saat Analisis</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <span className="text-xs text-slate-500 block mb-1">Durasi Rute Tercepat</span>
              <p className="text-sm font-bold text-slate-900">
                {fastestMinutes} menit{' '}
                {extraMinutes > 0 && (
                  <span className="text-xs font-semibold text-amber-700">
                    (+{extraMinutes} menit ekstra untuk udara lebih bersih)
                  </span>
                )}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <span className="text-xs text-slate-500 block mb-1">
                Paparan PM2.5 Rute Tercepat
              </span>
              <p className="text-sm font-bold text-slate-900">
                {trip.fastest.exposureIndexPm25 !== null
                  ? `${trip.fastest.exposureIndexPm25.toFixed(1)} µg/m³`
                  : 'Tidak tersedia'}
              </p>
            </div>
          </div>
        </div>

        {/* Top Contributor Segments if available */}
        {trip.estimate?.topContributors && trip.estimate.topContributors.length > 0 && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 mb-8 shadow-sm">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-600" />
              <span>Segmen Kontributor Polusi Tertinggi</span>
            </h2>

            <div className="space-y-2.5">
              {trip.estimate.topContributors.map((contrib, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="text-slate-800 font-bold">
                      Segmen #{contrib.segmentIndex + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <span className="text-slate-500">
                      PM2.5:{' '}
                      <strong className="text-slate-900">
                        {contrib.pm25 !== null ? `${contrib.pm25.toFixed(1)} µg/m³` : 'N/A'}
                      </strong>
                    </span>
                    <span className="text-amber-700 font-bold">
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
        <div className="p-4 bg-white border border-slate-200 rounded-2xl text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Versi Algoritma: <strong className="text-slate-700">{trip.algorithmVersion}</strong></span>
          </div>

          <div>
            <span>Sumber Data Polusi: <strong className="text-slate-700">{trip.dataSource}</strong></span>
          </div>

          <div>
            <span>Bobot Eksposur Terpakai: <strong className="text-slate-700">{trip.usedExposureWeight}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
