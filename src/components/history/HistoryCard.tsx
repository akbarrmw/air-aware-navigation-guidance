/**
 * Komponen kartu ringkasan riwayat perjalanan dengan metrik paparan polusi.
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
  Car,
  Bike,
  Footprints,
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
        bg: 'bg-emerald-50',
        text: 'text-emerald-800',
        border: 'border-emerald-200',
        label: 'Baik',
      };
    case 'moderate':
      return {
        bg: 'bg-yellow-50',
        text: 'text-yellow-800',
        border: 'border-yellow-200',
        label: 'Sedang',
      };
    case 'unhealthySensitive':
      return {
        bg: 'bg-orange-50',
        text: 'text-orange-800',
        border: 'border-orange-200',
        label: 'Sensitif',
      };
    case 'unhealthy':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-800',
        border: 'border-rose-200',
        label: 'Tidak Sehat',
      };
    case 'veryUnhealthy':
      return {
        bg: 'bg-purple-50',
        text: 'text-purple-800',
        border: 'border-purple-200',
        label: 'Sangat Buruk',
      };
    case 'hazardous':
      return {
        bg: 'bg-red-100',
        text: 'text-red-900',
        border: 'border-red-300',
        label: 'Berbahaya',
      };
    default:
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-200',
        label: 'Tanpa Data',
      };
  }
}

function renderTransportModeBadge(mode?: 'car' | 'motorcycle' | 'walk') {
  switch (mode) {
    case 'motorcycle':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-amber-50 text-amber-800 border-amber-200">
          <Bike className="w-3.5 h-3.5" />
          <span>Motor</span>
        </span>
      );
    case 'walk':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-blue-50 text-blue-800 border-blue-200">
          <Footprints className="w-3.5 h-3.5" />
          <span>Jalan Kaki</span>
        </span>
      );
    case 'car':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-slate-100 text-slate-800 border-slate-200">
          <Car className="w-3.5 h-3.5" />
          <span>Mobil</span>
        </span>
      );
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
    <div className="bg-white border border-slate-200/90 hover:border-emerald-400 hover:shadow-lg rounded-2xl p-5 transition-all shadow-sm relative group">
      {/* Header Info: Date & Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{dateFormatted}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {renderTransportModeBadge(trip.transportMode)}

          {trip.wasRecommended && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Sparkles className="w-3 h-3 text-emerald-600" />
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
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 mt-1 shrink-0 ring-4 ring-emerald-100" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
              Asal
            </span>
            <p className="text-sm font-bold text-slate-900 truncate">
              {trip.originLabel}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1 shrink-0 ring-4 ring-rose-100" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
              Tujuan
            </span>
            <p className="text-sm font-bold text-slate-900 truncate">
              {trip.destinationLabel}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80 mb-4 text-center">
        <div>
          <span className="block text-[10px] text-slate-500 font-bold uppercase">
            Jarak
          </span>
          <span className="text-xs font-bold text-slate-900 flex items-center justify-center gap-1 mt-0.5">
            <Navigation className="w-3 h-3 text-emerald-600" />
            {distanceKm} km
          </span>
        </div>

        <div>
          <span className="block text-[10px] text-slate-500 font-bold uppercase">
            Waktu
          </span>
          <span className="text-xs font-bold text-slate-900 flex items-center justify-center gap-1 mt-0.5">
            <Clock className="w-3 h-3 text-amber-600" />
            {minutes} menit
          </span>
        </div>

        <div>
          <span className="block text-[10px] text-slate-500 font-bold uppercase">
            PM2.5 Rata-rata
          </span>
          <span className="text-xs font-bold text-slate-900 flex items-center justify-center gap-1 mt-0.5">
            <Wind className="w-3 h-3 text-teal-600" />
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
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-50 text-xs flex items-center gap-1"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Hapus</span>
        </button>

        <Link
          href={`/history/${trip.tripId}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
        >
          <span>Detail Analisis</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
