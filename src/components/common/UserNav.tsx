/**
 * Komponen status pengguna dan navigasi akun di header navigasi.
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, LogOut, ChevronDown, Settings } from 'lucide-react';
import { useAuthUser } from '@/lib/client/auth/useAuthUser';
import { signOut } from '@/lib/client/auth/authActions';

export function UserNav() {
  const router = useRouter();
  const { user, loading } = useAuthUser();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
    router.push('/login');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse border border-slate-300" />
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Link
          href="/settings"
          title="Pengaturan"
          className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition hidden sm:inline-flex"
          aria-label="Pengaturan"
        >
          <Settings className="w-4 h-4" />
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Masuk</span>
        </Link>
      </div>
    );
  }

  const initial = (user.email?.[0] || 'U').toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-1.5 sm:gap-2 p-1 pl-1.5 pr-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200 shadow-sm transition text-slate-700"
        aria-label="Menu Akun Pengguna"
      >
        <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
          {initial}
        </span>
        <span className="text-xs font-semibold max-w-[80px] sm:max-w-[120px] truncate hidden sm:inline-block">
          {user.email?.split('@')[0]}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-slide-down">
          {/* User info header */}
          <div className="px-4 py-2 border-b border-slate-100">
            <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Masuk sebagai
            </span>
            <span className="block text-xs font-bold text-slate-900 truncate" title={user.email || ''}>
              {user.email}
            </span>
          </div>

          {/* Quick Links */}
          <div className="py-1 border-b border-slate-100">
            <Link
              href="/settings"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Pengaturan &amp; Privasi</span>
            </Link>
          </div>

          {/* Sign out */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition text-left"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>Keluar dari Akun</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
