/**
 * @file HistoryCard.tsx
 * @description Kartu ringkasan riwayat perjalanan dengan metrik paparan dan navigasi ke detail (P-05).
 * @author Person 3 (Database, Auth, & History Services)
 * @module components/history/HistoryCard
 * @see CODE_SPEC_AANG.md Bagian 8.1 & FR-11
 */

'use client';

import React from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Navigation,
  Wind,
  Trash2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import type { TripListItem } from '@/types/trips';
import type { AqiCategoryCode } from '@/types/aqiScale';

interface HistoryCardProps {
  trip: TripListItem;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

function getAqiBadgeStyle(category: AqiCategoryCode | null): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  switch (category) {
    case 'good':
      return {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        label: 'Baik',
      };
    case 'moderate':
      return {
        bg: 'bg-yellow-500/10',
        text: 'text-yellow-400',
        border: 'border-yellow-500/30',
        label: 'Sedang',
      };
    case 'unhealthySensitive':
      return {
        bg: 'bg-orange-500/10',
        text: 'text-orange-400',
        border: 'border-orange-500/30',
        label: 'Sensitif',
      };
    case 'unhealthy':
      return {
        bg: 'bg-rose-500/10',
        text: 'text-rose-400',
        border: 'border-rose-500/30',
        label: 'Tidak Sehat',
      };
    case 'veryUnhealthy':
      return {
        bg: 'bg-purple-500/10',
        text: 'text-purple-400',
        border: 'border-purple-500/30',
        label: 'Sangat Buruk',
      };
    case 'hazardous':
      return {
        bg: 'bg-red-950/40',
        text: 'text-red-400',
        border: 'border-red-600/50',
        label: 'Berbahaya',
      };
    default:
      return {
        bg: 'bg-slate-800/50',
        text: 'text-slate-400',
        border: 'border-slate-700',
        label: 'Tanpa Data',
      };
  }
}

export function HistoryCard({ trip, onDelete, isDeleting = false }: HistoryCardProps) {
  const badge = getAqiBadgeStyle(trip.category);

  // Format durasi
  const minutes = Math.round(trip.durationSeconds / 60);
  const distanceKm = (trip.distanceMeters / 1000).toFixed(1);

  // Format tanggal lokal
  const dateFormatted = new Date(trip.analyzedAt).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all shadow-md hover:shadow-xl backdrop-blur-md relative group">
      {/* Header Info: Date & Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>{dateFormatted}</span>
        </div>

        <div className="flex items-center gap-2">
          {trip.wasRecommended && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Sparkles className="w-3 h-3" />
              Pilihan Bersih
            </span>
          )}

          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
          >
            <Wind className="w-3 h-3" />
            {badge.label}
          </span>
        </div>
      </div>

      {/* Origin -> Destination Route */}
      <div className="space-y-2 mb-4">
        <div className="flex items-start gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0 ring-4 ring-emerald-500/20" />
          <div className="flex-1 min-w-0">
            <span className="text-[11px] text-slate-500 font-medium block uppercase tracking-wider">
              Asal
            </span>
            <p className="text-sm font-semibold text-white truncate">
              {trip.originLabel}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1 shrink-0 ring-4 ring-rose-500/20" />
          <div className="flex-1 min-w-0">
            <span className="text-[11px] text-slate-500 font-medium block uppercase tracking-wider">
              Tujuan
            </span>
            <p className="text-sm font-semibold text-white truncate">
              {trip.destinationLabel}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 mb-4 text-center">
        <div>
          <span className="block text-[10px] text-slate-500 font-medium uppercase">
            Jarak
          </span>
          <span className="text-xs font-bold text-white flex items-center justify-center gap-1 mt-0.5">
            <Navigation className="w-3 h-3 text-emerald-400" />
            {distanceKm} km
          </span>
        </div>

        <div>
          <span className="block text-[10px] text-slate-500 font-medium uppercase">
            Waktu
          </span>
          <span className="text-xs font-bold text-white flex items-center justify-center gap-1 mt-0.5">
            <Clock className="w-3 h-3 text-amber-400" />
            {minutes} menit
          </span>
        </div>

        <div>
          <span className="block text-[10px] text-slate-500 font-medium uppercase">
            PM2.5 Rata-rata
          </span>
          <span className="text-xs font-bold text-white flex items-center justify-center gap-1 mt-0.5">
            <Wind className="w-3 h-3 text-teal-400" />
            {trip.avgPm25 !== null ? `${trip.avgPm25.toFixed(1)} µg/m³` : 'N/A'}
          </span>
        </div>
      </div>

      {/* Actions: View Detail & Delete */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={() => onDelete(trip.tripId)}
          disabled={isDeleting}
          aria-label="Hapus riwayat perjalanan"
          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition disabled:opacity-50 text-xs flex items-center gap-1"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Hapus</span>
        </button>

        <Link
          href={`/history/${trip.tripId}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition border border-slate-700/80 hover:border-slate-600"
        >
          <span>Detail Analisis</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
