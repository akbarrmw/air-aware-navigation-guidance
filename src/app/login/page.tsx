/**
 * @file page.tsx
 * @description Halaman Autentikasi Pengguna P-04 (Mode Masuk & Mode Daftar) untuk AANG.
 * @author Person 3 (Database, Auth, & History Services)
 * @see CODE_SPEC_AANG.md Bagian 8.1 & FR-10
 */

'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';

function AuthContent() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
          <span className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition">
            🌱
          </span>
          <span className="font-extrabold text-2xl tracking-tight text-white">
            AANG
          </span>
        </Link>
        <h1 className="text-2xl font-black text-white tracking-tight">
          {activeTab === 'login' ? 'Selamat Datang Kembali' : 'Mulai Bersama AANG'}
        </h1>
        <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
          {activeTab === 'login'
            ? 'Masuk untuk mengakses riwayat rute dan analisis paparan personal Anda.'
            : 'Daftar akun gratis untuk menyimpan perjalanan dan preferensi rute sehat.'}
        </p>
      </div>

      {/* Auth Card Container */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        {/* Tab Toggle Switch */}
        <div className="grid grid-cols-2 p-1 bg-slate-950/80 border border-slate-800 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('login')}
            className={`py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'login'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('register')}
            className={`py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'register'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Daftar Baru
          </button>
        </div>

        {/* Tab Form Render */}
        {activeTab === 'login' ? (
          <LoginForm onSwitchToRegister={() => setActiveTab('register')} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setActiveTab('login')} />
        )}
      </div>

      {/* Guest Navigation Note */}
      <div className="text-center mt-6">
        <Link
          href="/routes"
          className="text-xs text-slate-400 hover:text-emerald-400 transition"
        >
          ← Lanjutkan Analisis Rute sebagai Pengunjung (Tanpa Login)
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6">
      <Suspense
        fallback={
          <div className="text-slate-400 text-sm animate-pulse">
            Memuat formulir autentikasi...
          </div>
        }
      >
        <AuthContent />
      </Suspense>
    </div>
  );
}
