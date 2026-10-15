/**
 * @file LoginForm.tsx
 * @description Formulir masuk (Sign In) dengan validasi dan penanganan status responsif.
 * @author Person 3 (Database, Auth, & History Services)
 * @module components/auth/LoginForm
 * @see CODE_SPEC_AANG.md Bagian 8.1 & AC-10.2, AC-10.4
 */

'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmail } from '@/lib/client/auth/authActions';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get('redirectTo') || '/history';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const result = await signInWithEmail(email, password);

      if (!result.success) {
        setErrorMessage(result.error || 'Gagal masuk. Silakan periksa kembali email dan kata sandi Anda.');
        setLoading(false);
        return;
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err) {
      console.error('[LoginForm] Error:', err);
      setErrorMessage('Terjadi kendala saat menghubungkan ke server autentikasi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && (
        <div
          role="alert"
          className="p-3 bg-rose-950/80 border border-rose-700/60 rounded-xl text-rose-300 text-xs leading-relaxed"
        >
          {errorMessage}
        </div>
      )}

      <div>
        <label className="block text-xs uppercase font-bold tracking-wider text-slate-400 mb-1.5">
          Alamat Email
        </label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@email.com"
          className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs uppercase font-bold tracking-wider text-slate-400">
            Kata Sandi
          </label>
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-[11px] text-emerald-400 hover:underline"
          >
            {showPassword ? 'Sembunyikan' : 'Tampilkan'}
          </button>
        </div>
        <input
          type={showPassword ? 'text' : 'password'}
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-500/20 mt-2"
      >
        {loading ? 'Memverifikasi...' : 'Masuk ke Akun'}
      </button>

      {onSwitchToRegister && (
        <p className="text-center text-xs text-slate-400 pt-3">
          Belum memiliki akun AANG?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-emerald-400 font-semibold hover:underline"
          >
            Daftar Sekarang
          </button>
        </p>
      )}
    </form>
  );
}
