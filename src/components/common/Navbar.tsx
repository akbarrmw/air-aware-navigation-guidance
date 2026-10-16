/**
 * @file Navbar.tsx
 * @description Komponen navigasi utama topbar dengan indikator rute aktif dan efek shadow interaktif.
 * @module components/common/Navbar
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RouteIcon, LayersIcon, HistoryIcon } from '@/components/common/Icons';

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/routes',
      label: 'Navigasi Rute',
      icon: RouteIcon,
      isActive: pathname === '/routes' || pathname?.startsWith('/routes/'),
    },
    {
      href: '/map',
      label: 'Peta Polusi',
      icon: LayersIcon,
      isActive: pathname === '/map' || pathname?.startsWith('/map/'),
    },
    {
      href: '/history',
      label: 'Riwayat',
      icon: HistoryIcon,
      isActive: pathname === '/history' || pathname?.startsWith('/history/'),
    },
  ];

  return (
    <nav
      className="hidden md:flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/90 shadow-inner"
      aria-label="Navigasi Utama"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              item.isActive
                ? 'bg-white text-emerald-800 shadow-md shadow-slate-300/70 border border-slate-200/90 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Icon
              size={16}
              className={item.isActive ? 'text-emerald-600' : 'text-slate-500'}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
