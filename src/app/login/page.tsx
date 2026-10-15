'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Simulasi: Berhasil masuk ke akun demo.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-xl p-8 border border-slate-700 shadow-xl">
        <h1 className="text-2xl font-bold mb-2 text-emerald-400">
          {isRegister ? 'Daftar Akun AANG' : 'Masuk ke AANG'}
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          Simpan riwayat perjalanan dan amati pola akumulasi paparan udara Anda.
        </p>

        {message && (
          <div className="mb-4 p-3 bg-emerald-950 border border-emerald-600 rounded text-emerald-300 text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              placeholder="nama@email.com"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">
              Kata Sandi (min. 8 karakter)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded font-semibold transition"
          >
            {isRegister ? 'Buat Akun' : 'Masuk'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          {isRegister ? 'Sudah punya akun? ' : 'Belum punya akun? '}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-emerald-400 hover:underline font-medium"
          >
            {isRegister ? 'Masuk sekarang' : 'Daftar sekarang'}
          </button>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-400">
            ← Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
