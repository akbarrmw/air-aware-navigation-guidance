/**
 * @file StationDetailPanel.tsx
 * @description Panel rincian informasi satu stasiun kualitas udara yang dipilih (P-02).
 * Menampilkan konsentrasi PM2.5, polutan dominan, usia data, badge kesegaran, dan atribusi sumber data.
 * 
 * @author Person 3 (Database, Auth, & History Services)
 * @module components/air-map/StationDetailPanel
 * @see CODE_SPEC_AANG.md Bagian 8.1 & FR-02
 */

'use client';

import React from 'react';
import Link from 'next/link';
import {
  Wind,
  Clock,
  Navigation,
  Database,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import type { StationData, FreshnessStatus } from '@/types/air-quality';

interface StationDetailPanelProps {
  station: StationData | null;
  onClose?: () => void;
}

function getAqiBadge(aqi: number | null): {
  label: string;
  badgeClass: string;
  textClass: string;
} {
  if (aqi === null) {
    return {
      label: 'Tidak Ada Data',
      badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
      textClass: 'text-slate-400',
    };
  }
  if (aqi <= 50) {
    return {
      label: 'Baik (0–50)',
      badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      textClass: 'text-emerald-400',
    };
  }
  if (aqi <= 100) {
    return {
      label: 'Sedang (51–100)',
      badgeClass: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
      textClass: 'text-yellow-400',
    };
  }
  if (aqi <= 150) {
    return {
      label: 'Tidak Sehat bagi Sensitif (101–150)',
      badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
      textClass: 'text-orange-400',
    };
  }
  if (aqi <= 200) {
    return {
      label: 'Tidak Sehat (151–200)',
      badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      textClass: 'text-rose-400',
    };
  }
  if (aqi <= 300) {
    return {
      label: 'Sangat Tidak Sehat (201–300)',
      badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      textClass: 'text-purple-400',
    };
  }
  return {
    label: 'Berbahaya (301+)',
    badgeClass: 'bg-red-950/60 text-red-400 border-red-700/60',
    textClass: 'text-red-400',
  };
}

function getFreshnessBadge(status: FreshnessStatus) {
  switch (status) {
    case 'fresh':
      return {
        label: 'Mutakhir (Fresh)',
        icon: CheckCircle2,
        className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      };
    case 'stale':
      return {
        label: 'Usang (Stale)',
        icon: AlertTriangle,
        className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
      };
    case 'expired':
      return {
        label: 'Kedaluwarsa (Expired)',
        icon: XCircle,
        className: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      };
  }
}

export function StationDetailPanel({ station }: StationDetailPanelProps) {
  if (!station) {
    return (
      <div className="p-6 text-center text-slate-500 text-xs">
        Pilih salah satu stasiun pemantau di peta untuk melihat rincian polutan.
      </div>
    );
  }

  const aqiInfo = getAqiBadge(station.aqi);
  const freshnessInfo = getFreshnessBadge(station.freshness);
  const FreshnessIcon = freshnessInfo.icon;

  const observedFormatted = station.observedAt
    ? new Date(station.observedAt).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Waktu tidak tersedia';

  return (
    <div className="space-y-5">
      {/* Station Name & AQI Level Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
            ID: {station.stationId}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${freshnessInfo.className}`}
          >
            <FreshnessIcon className="w-3 h-3" />
            <span>{freshnessInfo.label}</span>
          </span>
        </div>

        <h3 className="text-lg font-black text-white leading-tight">
          {station.stationName}
        </h3>
      </div>

      {/* Primary AQI & PM2.5 Metric Box */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800/60">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              Indeks Kualitas Udara
            </span>
            <span className={`text-3xl font-black ${aqiInfo.textClass}`}>
              {station.aqi !== null ? station.aqi : '—'}
            </span>
          </div>

          <span
            className={`px-3 py-1 rounded-xl text-xs font-bold border ${aqiInfo.badgeClass}`}
          >
            {aqiInfo.label}
          </span>
        </div>

        {/* PM2.5 & PM10 Details */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/60">
            <span className="text-[10px] text-slate-500 font-bold uppercase block">
              PM2.5
            </span>
            <span className="text-sm font-extrabold text-white mt-0.5 block">
              {station.pm25Concentration !== null
                ? `${station.pm25Concentration.toFixed(1)} µg/m³`
                : 'N/A'}
            </span>
            <span className="text-[9px] text-slate-500 block mt-0.5">
              {station.pm25Origin === 'measured'
                ? 'Sensor Fisik'
                : station.pm25Origin === 'derivedFromAqi'
                ? 'Tafsiran AQI'
                : 'Tidak Tersedia'}
            </span>
          </div>

          <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/60">
            <span className="text-[10px] text-slate-500 font-bold uppercase block">
              PM10
            </span>
            <span className="text-sm font-extrabold text-white mt-0.5 block">
              {station.pm10Concentration !== null
                ? `${station.pm10Concentration.toFixed(1)} µg/m³`
                : 'N/A'}
            </span>
            <span className="text-[9px] text-slate-500 block mt-0.5">Partikulat Kasar</span>
          </div>
        </div>
      </div>

      {/* Secondary Sensor Meta */}
      <div className="space-y-2.5 text-xs">
        <div className="flex items-center justify-between p-2.5 bg-slate-950/40 rounded-xl border border-slate-800/60">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>Polutan Dominan:</span>
          </span>
          <span className="font-bold text-white uppercase">
            {station.dominantPollutant || 'PM2.5'}
          </span>
        </div>

        <div className="flex items-center justify-between p-2.5 bg-slate-950/40 rounded-xl border border-slate-800/60">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Observasi:</span>
          </span>
          <span className="text-slate-300 font-medium text-right">
            {observedFormatted}
            {station.ageMinutes !== null && (
              <span className="text-[10px] text-slate-500 block">
                ({station.ageMinutes} menit lalu)
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between p-2.5 bg-slate-950/40 rounded-xl border border-slate-800/60">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>Penyedia Data:</span>
          </span>
          <span className="font-semibold text-white">{station.sourceName}</span>
        </div>

        <div className="flex items-center justify-between p-2.5 bg-slate-950/40 rounded-xl border border-slate-800/60">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-emerald-400" />
            <span>Koordinat:</span>
          </span>
          <span className="font-mono text-[11px] text-slate-300">
            {station.lat.toFixed(4)}, {station.lng.toFixed(4)}
          </span>
        </div>
      </div>

      {/* Navigation Shortcut to Routes Planner */}
      <div className="pt-2">
        <Link
          href={`/routes?destLat=${station.lat}&destLng=${station.lng}&destLabel=${encodeURIComponent(
            station.stationName
          )}`}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-500/10"
        >
          <Wind className="w-4 h-4" />
          <span>Rencanakan Rute Menuju Stasiun Ini</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
