/**
 * Halaman Autentikasi Pengguna (Masuk & Daftar).
 */

'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { Leaf } from 'lucide-react';

function AuthContent() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-3 group">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-0.5 shadow-sm border border-slate-200 group-hover:scale-105 transition overflow-hidden">
            <img
              src="/logo.png"
              alt="Logo AANG"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-slate-900">
            AANG
          </span>
        </Link>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {activeTab === 'login' ? 'Selamat Datang Kembali' : 'Mulai Bersama AANG'}
        </h1>
        <p className="text-slate-600 text-xs mt-1.5 leading-relaxed">
          {activeTab === 'login'
            ? 'Masuk untuk mengakses riwayat rute dan analisis paparan personal Anda.'
            : 'Daftar akun gratis untuk menyimpan perjalanan dan preferensi rute sehat.'}
        </p>
      </div>

      {/* Auth Card Container */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl">
        {/* Tab Toggle Switch */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 border border-slate-200 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('login')}
            className={`py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'login'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('register')}
            className={`py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'register'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
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
          className="text-xs font-semibold text-slate-500 hover:text-emerald-700 transition"
        >
          Lanjutkan Analisis Rute sebagai Pengunjung (Tanpa Login)
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="w-full h-[calc(100vh-56px)] mt-[56px] overflow-y-auto bg-slate-100 flex items-center justify-center py-12 px-4 sm:px-6">
      <Suspense
        fallback={
          <div className="text-slate-500 text-sm animate-pulse">
            Memuat formulir autentikasi...
          </div>
        }
      >
        <AuthContent />
      </Suspense>
    </div>
  );
}
