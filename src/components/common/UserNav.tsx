/**
 * @file UserNav.tsx
 * @description Komponen status pengguna dan navigasi akun di header topbar (Masuk / Profil / Logout).
 * @author Person 3 / Enhanced for consistent UI
 * @module components/common/UserNav
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, LogIn, LogOut, History, Shield, ChevronDown } from 'lucide-react';
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
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition"
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>Masuk</span>
      </Link>
    );
  }

  const initial = (user.email?.[0] || 'U').toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200 shadow-sm transition text-slate-700"
        aria-label="Menu Akun Pengguna"
      >
        <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
          {initial}
        </span>
        <span className="text-xs font-semibold max-w-[100px] truncate hidden sm:inline-block">
          {user.email?.split('@')[0]}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-slide-down">
          {/* User info header */}
          <div className="px-4 py-2 border-b border-slate-100">
            <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Masuk sebagai
            </span>
            <span className="block text-xs font-bold text-slate-900 truncate" title={user.email || ''}>
              {user.email}
            </span>
          </div>

          {/* Links */}
          <div className="py-1">
            <Link
              href="/history"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
            >
              <History className="w-4 h-4 text-emerald-600" />
              <span>Riwayat Perjalanan</span>
            </Link>
          </div>

          {/* Sign out */}
          <div className="border-t border-slate-100 pt-1 mt-1">
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
