/**
 * @file RegisterForm.tsx
 * @description Formulir pendaftaran akun baru dengan validasi kata sandi (AC-10.2) & penanganan status.
 * @author Person 3 (Database, Auth, & History Services)
 * @module components/auth/RegisterForm
 * @see CODE_SPEC_AANG.md Bagian 8.1 & AC-10.2, AC-10.4, ASM-09
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUpWithEmail, validatePassword } from '@/lib/client/auth/authActions';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Validasi kesamaan kata sandi
    if (password !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    // 2. Validasi kekuatan kata sandi (AC-10.2)
    const pwdCheck = validatePassword(password);
    if (!pwdCheck.isValid) {
      setErrorMessage(pwdCheck.error || 'Kata sandi tidak memenuhi kriteria keamanan.');
      return;
    }

    setLoading(true);

    try {
      const result = await signUpWithEmail(email, password);

      if (!result.success) {
        setErrorMessage(result.error || 'Pendaftaran akun gagal. Silakan coba kembali.');
        setLoading(false);
        return;
      }

      setSuccessMessage('Akun AANG berhasil dibuat! Mengalihkan ke dashboard...');

      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/history');
          router.refresh();
        }
      }, 1200);
    } catch (err) {
      console.error('[RegisterForm] Error:', err);
      setErrorMessage('Terjadi kendala saat menghubungi server pendaftaran.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && (
        <div
          role="alert"
          className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs leading-relaxed font-medium"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs leading-relaxed font-medium"
        >
          {successMessage}
        </div>
      )}

      <div>
        <label className="block text-xs uppercase font-bold tracking-wider text-slate-700 mb-1.5">
          Alamat Email
        </label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@email.com"
          className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs uppercase font-bold tracking-wider text-slate-700">
            Kata Sandi Baru
          </label>
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
          >
            {showPassword ? 'Sembunyikan' : 'Tampilkan'}
          </button>
        </div>
        <input
          type={showPassword ? 'text' : 'password'}
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 8 karakter (huruf & angka)"
          className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition"
        />
        <span className="block text-[11px] text-slate-500 mt-1">
          Wajib memuat minimal 8 karakter dengan kombinasi huruf dan angka.
        </span>
      </div>

      <div>
        <label className="block text-xs uppercase font-bold tracking-wider text-slate-700 mb-1.5">
          Ulangi Kata Sandi
        </label>
        <input
          type={showPassword ? 'text' : 'password'}
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition shadow-md shadow-emerald-600/20 mt-2"
      >
        {loading ? 'Mendaftarkan Akun...' : 'Daftar Akun Baru'}
      </button>

      {onSwitchToLogin && (
        <p className="text-center text-xs text-slate-500 pt-3">
          Sudah memiliki akun?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-emerald-700 font-bold hover:underline"
          >
            Masuk di Sini
          </button>
        </p>
      )}
    </form>
  );
}
