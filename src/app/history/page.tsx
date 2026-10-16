/**
 * @file page.tsx
 * @description Halaman Riwayat Perjalanan P-05 untuk AANG.
 * Menampilkan daftar riwayat perjalanan terpaginasi, status paparan, dan aksi manajemen data.
 * 
 * @author Person 3 (Database, Auth, & History Services)
 * @module app/history/page
 * @see CODE_SPEC_AANG.md Bagian 8.1 & FR-11, AC-13.1
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Compass,
  Trash2,
  ChevronLeft,
  ChevronRight,
  History,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import { useAuthUser } from '@/lib/client/auth/useAuthUser';
import {
  fetchTripsList,
  deleteTripItem,
  clearAllTripsHistory,
} from '@/lib/client/tripsApi';
import type { TripListItem } from '@/types/trips';
import { HistoryCard } from '@/components/history/HistoryCard';
import { ConsentBanner } from '@/components/history/ConsentBanner';

export default function HistoryPage() {
  const { user, profile, loading: authLoading, refetchProfile } = useAuthUser();

  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function fetchHistory() {
      if (!user) {
        setLoading(false);
        return;
      }

      setErrorMessage(null);
      try {
        const res = await fetchTripsList(page, 6);
        if (!ignore) {
          if (res.success && res.data) {
            setTrips(res.data.items);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
          } else {
            setErrorMessage(res.error?.message || 'Gagal memuat riwayat perjalanan.');
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error('[HistoryPage] Error fetchHistory:', err);
          setErrorMessage('Terjadi kendala jaringan saat mengambil riwayat perjalanan.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchHistory();

    return () => {
      ignore = true;
    };
  }, [user, page, refreshTrigger]);

  const reloadTrips = useCallback(() => {
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleDeleteTrip = async (tripId: string) => {
    const confirmDelete = window.confirm('Apakah Anda yakin ingin menghapus catatan perjalanan ini?');
    if (!confirmDelete) return;

    setDeletingId(tripId);
    try {
      const res = await deleteTripItem(tripId);
      if (res.success) {
        // Muat ulang daftar
        reloadTrips();
      } else {
        alert(res.error?.message || 'Gagal menghapus perjalanan.');
      }
    } catch (err) {
      console.error('[HistoryPage] Error deleteTrip:', err);
      alert('Terjadi kendala saat menghapus.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    setIsClearingAll(true);
    try {
      const res = await clearAllTripsHistory();
      if (res.success) {
        setShowClearConfirm(false);
        setPage(1);
        reloadTrips();
      } else {
        alert(res.error?.message || 'Gagal menghapus seluruh riwayat.');
      }
    } catch (err) {
      console.error('[HistoryPage] Error clearAll:', err);
      alert('Gagal menghubungi server.');
    } finally {
      setIsClearingAll(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <RotateCw className="w-5 h-5 animate-spin text-emerald-500" />
          <span>Memverifikasi akun pengguna...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Privacy Consent Banner if Disabled */}
      {profile && (
        <ConsentBanner
          hasConsent={profile.history_consent}
          onConsentUpdated={refetchProfile}
        />
      )}

      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
            <History className="w-4 h-4" />
            <span>Penyimpanan Personal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Riwayat Perjalanan
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Daftar perjalanan yang Anda simpan beserta catatan paparan polusi PM2.5.
          </p>
        </div>

        {trips.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus Semua</span>
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 bg-rose-950/60 border border-rose-700/60 rounded-2xl text-rose-300 text-xs flex items-center gap-3 mb-6">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={reloadTrips}
            className="ml-auto underline font-bold"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Content Rendering: Loading / Empty / List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-48 bg-slate-900/50 border border-slate-800 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : trips.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 px-4 bg-slate-900/40 border border-slate-800/80 rounded-3xl backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 mb-4 shadow-lg shadow-emerald-500/5">
            <Compass className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-white">Belum Ada Perjalanan Tersimpan</h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto mt-1.5 leading-relaxed">
            Anda belum pernah menyimpan rute perjalanan. Rencanakan perjalanan pertama Anda dan pilih
            rute rendah paparan untuk mulai mengumpulkan riwayat.
          </p>
          <div className="mt-6">
            <Link
              href="/routes"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition shadow-lg shadow-emerald-500/20"
            >
              <span>Rencanakan Rute Sekarang</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        /* Trip Cards Grid */
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {trips.map((trip) => (
              <HistoryCard
                key={trip.tripId}
                trip={trip}
                onDelete={handleDeleteTrip}
                isDeleting={deletingId === trip.tripId}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-800/80 mt-8 pt-4">
              <span className="text-xs text-slate-500">
                Menampilkan halaman <strong className="text-slate-300">{page}</strong> dari{' '}
                <strong className="text-slate-300">{totalPages}</strong> ({total} total perjalanan)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 rounded-xl text-slate-400 hover:text-white transition"
                  aria-label="Halaman sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 rounded-xl text-slate-400 hover:text-white transition"
                  aria-label="Halaman berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Hapus Seluruh Riwayat?</h3>
                <p className="text-xs text-slate-400">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Seluruh rekaman perjalanan, koordinat polyline, dan snapshot estimasi paparan yang
              tersimpan pada akun Anda akan dihapus secara permanen dari basis data (AC-13.1).
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearingAll}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={isClearingAll}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition shadow-lg shadow-rose-600/20"
              >
                {isClearingAll ? 'Menghapus...' : 'Ya, Hapus Semua'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
