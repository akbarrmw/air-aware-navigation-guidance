/**
 * Halaman Pengaturan Preferensi, Privasi, dan Manajemen Akun.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sliders,
  ShieldCheck,
  UserX,
  AlertTriangle,
  RotateCw,
  CheckCircle2,
  Lock,
  Clock,
  Wind,
  Timer,
  Leaf,
  Settings,
} from 'lucide-react';
import { useAuthUser } from '@/lib/client/auth/useAuthUser';
import { clearAllTripsHistory } from '@/lib/client/tripsApi';
import {
  fetchUserPreferences,
  updateUserPreferences,
  updateHistoryConsent,
  deleteUserAccount,
} from '@/lib/client/accountApi';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthUser();

  // State Preferensi Rute (exposureWeight memiliki 4 interval / 5 posisi diskrit: 0, 0.25, 0.5, 0.75, 1.0)
  const [exposureWeight, setExposureWeight] = useState(0.5);
  const [maxExtraTimePercent, setMaxExtraTimePercent] = useState<number | null>(30);
  const [isTimeUnlimited, setIsTimeUnlimited] = useState(false);
  const [historyConsent, setHistoryConsent] = useState(false);
  const [consentUpdatedAt, setConsentUpdatedAt] = useState<string | null>(null);

  // Status aksi
  const [initialLoading, setInitialLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [togglingConsent, setTogglingConsent] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // State Modal Zona Berbahaya
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);

  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Memuat data preferensi awal
  useEffect(() => {
    let ignore = false;

    async function loadData() {
      if (!user) {
        setInitialLoading(false);
        return;
      }

      try {
        const res = await fetchUserPreferences();
        if (!ignore && res.success && res.data) {
          const rawWeight = res.data.exposureWeight ?? 0.5;
          const roundedWeight = Math.round(rawWeight * 4) / 4;
          setExposureWeight(roundedWeight);
          if (res.data.maxExtraTimePercent === null) {
            setIsTimeUnlimited(true);
            setMaxExtraTimePercent(30);
          } else {
            setIsTimeUnlimited(false);
            setMaxExtraTimePercent(res.data.maxExtraTimePercent);
          }
          setHistoryConsent(res.data.historyConsent);
        }
      } catch (err) {
        if (!ignore) {
          console.error('[SettingsPage] Error loadPreferences:', err);
        }
      } finally {
        if (!ignore) {
          setInitialLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [user]);

  // Simpan Preferensi Rute
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrefs(true);
    setSuccessToast(null);
    setErrorToast(null);

    try {
      const payload = {
        exposureWeight,
        maxExtraTimePercent: isTimeUnlimited ? null : maxExtraTimePercent,
        historyConsent,
      };

      const res = await updateUserPreferences(payload);
      if (res.success) {
        setSuccessToast('Preferensi rute default berhasil disimpan.');
        setTimeout(() => setSuccessToast(null), 3000);
      } else {
        setErrorToast(res.error?.message || 'Gagal menyimpan preferensi.');
      }
    } catch {
      setErrorToast('Terjadi kesalahan jaringan.');
    } finally {
      setSavingPrefs(false);
    }
  };

  // Toggle Persetujuan Privasi (Consent)
  const handleToggleConsent = async () => {
    const nextConsent = !historyConsent;
    setTogglingConsent(true);
    setErrorToast(null);

    try {
      const res = await updateHistoryConsent(nextConsent);
      if (res.success && res.data) {
        setHistoryConsent(res.data.historyConsent);
        setConsentUpdatedAt(res.data.consentUpdatedAt);
        setSuccessToast(
          nextConsent
            ? 'Penyimpanan riwayat perjalanan telah diaktifkan.'
            : 'Penyimpanan riwayat perjalanan telah dinonaktifkan.'
        );
        setTimeout(() => setSuccessToast(null), 3000);
      } else {
        setErrorToast(res.error?.message || 'Gagal mengubah status izin.');
      }
    } catch {
      setErrorToast('Terjadi kesalahan saat menghubungi server.');
    } finally {
      setTogglingConsent(false);
    }
  };

  // Hapus Seluruh Riwayat
  const handleClearHistory = async () => {
    setIsClearingHistory(true);
    try {
      const res = await clearAllTripsHistory();
      if (res.success) {
        setShowClearHistoryModal(false);
        setSuccessToast('Seluruh riwayat perjalanan berhasil dibersihkan.');
        setTimeout(() => setSuccessToast(null), 3000);
      } else {
        alert(res.error?.message || 'Gagal membersihkan riwayat.');
      }
    } catch {
      alert('Gagal menghubungi server.');
    } finally {
      setIsClearingHistory(false);
    }
  };

  // Hapus Akun Permanen
  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);
    setIsDeletingAccount(true);

    try {
      const res = await deleteUserAccount(deletePassword);
      if (res.success) {
        alert('Akun AANG Anda telah berhasil dihapus secara tuntas.');
        router.push('/');
        router.refresh();
      } else {
        setDeleteError(res.error?.message || 'Kata sandi salah atau gagal menghapus akun.');
      }
    } catch {
      setDeleteError('Terjadi kendala jaringan saat memproses penghapusan akun.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (authLoading || initialLoading) {
    return (
      <div className="w-full h-[calc(100vh-56px)] mt-[56px] flex items-center justify-center p-6 bg-slate-100">
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <RotateCw className="w-5 h-5 animate-spin text-emerald-600" />
          <span>Memuat pengaturan akun...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-56px)] mt-[56px] overflow-y-auto custom-scrollbar bg-slate-100 p-4 sm:p-6 lg:p-8 pb-28 md:pb-16 text-slate-800">
      <div className="max-w-4xl mx-auto">
        {/* Toast Notifikasi */}
        {successToast && (
          <div className="fixed top-20 right-6 z-50 p-3.5 px-4 bg-emerald-600 text-white rounded-2xl text-xs flex items-center gap-2 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>{successToast}</span>
          </div>
        )}

        {errorToast && (
          <div className="fixed top-20 right-6 z-50 p-3.5 px-4 bg-rose-600 text-white rounded-2xl text-xs flex items-center gap-2 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
            <AlertTriangle className="w-4 h-4 text-white" />
            <span>{errorToast}</span>
          </div>
        )}

        {/* Header Info */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
            <Settings className="w-4 h-4 text-emerald-600" />
            <span>Preferensi &amp; Privasi Akun</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Pengaturan Pengguna
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-1">
            Kelola preferensi navigasi cerdas Anda, privasi penyimpanan data, dan akun AANG (
            <strong className="text-slate-900 font-semibold">{user?.email}</strong>).
          </p>
        </div>

        <div className="space-y-8">
          {/* SECTION 1: Preferensi Default Perutean */}
          <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Preferensi Perutean Default</h2>
                <p className="text-xs text-slate-500">
                  Nilai acuan saat pertama kali membuka perencana rute (dapat disesuaikan per trip).
                </p>
              </div>
            </div>

            <form onSubmit={handleSavePreferences} className="space-y-6">
              {/* Slider 1: Exposure Weight (4 Step Intervals / 5 Posisi Diskrit: 0, 0.25, 0.5, 0.75, 1.0) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-teal-600" />
                    <span>Prioritas Paparan Polusi vs Waktu</span>
                  </label>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/80 text-[11px]">
                    {exposureWeight === 0 && 'Tercepat'}
                    {exposureWeight === 0.25 && 'Cenderung Cepat'}
                    {exposureWeight === 0.5 && 'Seimbang'}
                    {exposureWeight === 0.75 && 'Cenderung Bersih'}
                    {exposureWeight === 1 && 'Paling Bersih'}
                  </span>
                </div>

                <div className="relative py-1">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.25"
                    value={exposureWeight}
                    onChange={(e) => setExposureWeight(parseFloat(e.target.value))}
                    className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer transition-all"
                  />

                  {/* 5 Step Indicator Ticks & Clickable Labels (4 Interval Pergeseran) */}
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium mt-1 px-0.5 select-none">
                    <button
                      type="button"
                      onClick={() => setExposureWeight(0)}
                      className={`hover:text-emerald-700 transition ${exposureWeight === 0 ? 'text-emerald-700 font-bold' : ''}`}
                    >
                      0%
                    </button>
                    <button
                      type="button"
                      onClick={() => setExposureWeight(0.25)}
                      className={`hover:text-emerald-700 transition ${exposureWeight === 0.25 ? 'text-emerald-700 font-bold' : ''}`}
                    >
                      25%
                    </button>
                    <button
                      type="button"
                      onClick={() => setExposureWeight(0.5)}
                      className={`hover:text-emerald-700 transition ${exposureWeight === 0.5 ? 'text-emerald-700 font-bold' : ''}`}
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => setExposureWeight(0.75)}
                      className={`hover:text-emerald-700 transition ${exposureWeight === 0.75 ? 'text-emerald-700 font-bold' : ''}`}
                    >
                      75%
                    </button>
                    <button
                      type="button"
                      onClick={() => setExposureWeight(1)}
                      className={`hover:text-emerald-700 transition ${exposureWeight === 1 ? 'text-emerald-700 font-bold' : ''}`}
                    >
                      100%
                    </button>
                  </div>
                </div>

                <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
                  <span className="inline-flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5 text-slate-400" />
                    <span>Prioritas Waktu</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Prioritas Udara Bersih</span>
                  </span>
                </div>
              </div>

              {/* Slider 2: Max Extra Time Tolerance */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Batas Tambahan Waktu Maksimal</span>
                  </label>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/80 text-[11px]">
                    {isTimeUnlimited ? 'Tidak Dibatasi' : `+${maxExtraTimePercent}%`}
                  </span>
                </div>

                <div className="relative py-1">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    disabled={isTimeUnlimited}
                    value={maxExtraTimePercent || 30}
                    onChange={(e) => setMaxExtraTimePercent(parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 transition-all"
                  />
                </div>

                <div className="flex items-center justify-between mt-2.5">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-600 hover:text-slate-900">
                    <input
                      type="checkbox"
                      checked={isTimeUnlimited}
                      onChange={(e) => setIsTimeUnlimited(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20"
                    />
                    <span>Izinkan rute alternatif tanpa batasan waktu (Unlimited)</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingPrefs}
                className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-600/20"
              >
                {savingPrefs ? 'Menyimpan...' : 'Simpan Preferensi Default'}
              </button>
            </form>
          </section>

          {/* SECTION 2: Kebijakan Privasi & Izin Riwayat */}
          <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Privasi &amp; Penyimpanan Data</h2>
                <p className="text-xs text-slate-500">
                  Kontrol eksplisit atas persetujuan penyimpanan jejak lokasi dan snapshot perjalanan.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <div className="flex-1 pr-4">
                  <span className="text-sm font-bold text-slate-900 block">
                    Simpan Riwayat Perjalanan Otomatis
                  </span>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Jika diaktifkan, rute yang Anda pilih akan disimpan ke dalam riwayat perjalanan
                    pribadi Anda. Jika dinonaktifkan, server tidak akan menyimpan rekaman perjalanan baru.
                  </p>
                  {consentUpdatedAt && (
                    <span className="text-[10px] text-slate-400 block mt-2">
                      Terakhir diperbarui: {new Date(consentUpdatedAt).toLocaleString('id-ID')}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleToggleConsent}
                  disabled={togglingConsent}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    historyConsent ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                  role="switch"
                  aria-checked={historyConsent}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      historyConsent ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Penjelasan Regulasi PRD */}
              <div className="p-4 bg-slate-50/70 border border-slate-200/70 rounded-2xl text-[11px] text-slate-600 space-y-1.5 leading-relaxed">
                <strong className="text-slate-800 block mb-1">
                  Jaminan Perlindungan Data Pribadi AANG:
                </strong>
                <p>• Data koordinat polyline hanya disimpan untuk rute yang secara sadar Anda pilih.</p>
                <p>• Kebijakan Retensi: Seluruh snapshot riwayat dibatasi 90 hari.</p>
                <p>• Data dienkapsulasi dengan Row-Level Security (RLS) dan tidak dapat dibaca oleh pengguna lain.</p>
              </div>
            </div>
          </section>

          {/* SECTION 3: Zona Berbahaya (Danger Zone) */}
          <section className="bg-rose-50/40 border border-rose-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-rose-200/60">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600 border border-rose-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-rose-900">Zona Berbahaya</h2>
                <p className="text-xs text-rose-600">
                  Aksi destruktif permanen terhadap data pribadi dan akun Anda.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Hapus Semua Riwayat */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-rose-200/70 rounded-2xl shadow-xs">
                <div>
                  <span className="text-sm font-bold text-slate-900 block">
                    Kosongkan Seluruh Riwayat Perjalanan
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Menghapus semua rekaman trip dari database tanpa menghapus profil akun Anda (AC-13.1).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowClearHistoryModal(true)}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold rounded-xl text-xs transition shrink-0 shadow-xs"
                >
                  Hapus Semua Riwayat
                </button>
              </div>

              {/* Hapus Akun Permanen */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-rose-200/70 rounded-2xl shadow-xs">
                <div>
                  <span className="text-sm font-bold text-rose-700 block">
                    Hapus Akun AANG Permanen
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Menghapus akun Anda beserta baris profil dan seluruh riwayat.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteAccountModal(true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-rose-600/20 shrink-0"
                >
                  Hapus Akun Permanen
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Modal 1: Konfirmasi Hapus Semua Riwayat */}
        {showClearHistoryModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Hapus Seluruh Riwayat?</h3>
                  <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Semua snapshot perjalanan yang telah Anda simpan akan dihapus secara permanen dari server kami.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearHistoryModal(false)}
                  disabled={isClearingHistory}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 bg-slate-50 border border-slate-200 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  disabled={isClearingHistory}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl transition shadow-md shadow-rose-600/20"
                >
                  {isClearingHistory ? 'Menghapus...' : 'Ya, Bersihkan Riwayat'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal 2: Konfirmasi Hapus Akun Permanen */}
        {showDeleteAccountModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                  <UserX className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Hapus Akun AANG Permanen?</h3>
                  <p className="text-xs text-slate-500">Tindakan ini permanen dan berjenjang.</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Untuk mengonfirmasi bahwa Anda adalah pemilik sah akun{' '}
                <strong className="text-slate-900">{user?.email}</strong>, silakan masukkan kata sandi Anda:
              </p>

              <form onSubmit={handleDeleteAccount} className="space-y-4">
                {deleteError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                    {deleteError}
                  </div>
                )}

                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Masukkan kata sandi akun"
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteAccountModal(false);
                      setDeletePassword('');
                      setDeleteError(null);
                    }}
                    disabled={isDeletingAccount}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 bg-slate-50 border border-slate-200 rounded-xl transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isDeletingAccount || !deletePassword}
                    className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 rounded-xl transition shadow-md shadow-rose-600/20"
                  >
                    {isDeletingAccount ? 'Memverifikasi & Menghapus...' : 'Hapus Akun Selamanya'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
