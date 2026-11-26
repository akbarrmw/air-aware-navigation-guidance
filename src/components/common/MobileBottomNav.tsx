/**
 * @file MobileBottomNav.tsx
 * @description Floating bottom navigation dock khusus untuk perangkat mobile / layar kecil.
 * Memberikan akses cepat satu jempol (one-thumb reach) ke seluruh halaman utama AANG.
 * @module components/common/MobileBottomNav
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  RouteIcon,
  LayersIcon,
  HistoryIcon,
} from '@/components/common/Icons';
import { Home, Settings } from 'lucide-react';

export function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/',
      label: 'Beranda',
      icon: Home,
      isActive: pathname === '/',
    },
    {
      href: '/routes',
      label: 'Rute',
      icon: RouteIcon,
      isActive: pathname === '/routes' || pathname?.startsWith('/routes/'),
    },
    {
      href: '/map',
      label: 'Peta',
      icon: LayersIcon,
      isActive: pathname === '/map' || pathname?.startsWith('/map/'),
    },
    {
      href: '/history',
      label: 'Riwayat',
      icon: HistoryIcon,
      isActive: pathname === '/history' || pathname?.startsWith('/history/'),
    },
    {
      href: '/settings',
      label: 'Setelan',
      icon: Settings,
      isActive: pathname === '/settings' || pathname?.startsWith('/settings/'),
    },
  ];

  return (
    <aside
      aria-label="Navigasi Bawah Layar Sentuh"
      className="fixed bottom-2.5 inset-x-3 z-40 md:hidden bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl px-2 py-1.5 transition-all"
    >
      <nav className="flex items-center justify-around" aria-label="Menu Utama Mobile">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 min-w-[54px] select-none ${
                active
                  ? 'text-emerald-700 font-bold scale-105'
                  : 'text-slate-500 hover:text-slate-800 active:scale-95'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-colors ${
                  active ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400'
                }`}
              >
                <Icon size={19} className={active ? 'stroke-[2.4]' : 'stroke-[1.8]'} />
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 leading-none ${active ? 'font-bold text-emerald-800' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
