/**
 * Halaman Peta Kualitas Udara Interaktif Nasional.
 */

'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  SearchIcon,
  CloseIcon,
  NavigationIcon,
} from '@/components/common/Icons';
import { Zap } from 'lucide-react';
import type { StationData } from '@/types/air-quality';
import type { ApiResponse } from '@/types/api';
import { AQI_CATEGORIES } from '@/types/aqiScale';

// Dynamic import Leaflet NavigationMap untuk mencegah SSR error
const NavigationMap = dynamic(() => import('@/components/map/NavigationMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-500">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-600">Memuat Peta Pemantauan Udara...</span>
      </div>
    </div>
  ),
});

export default function AirQualityMapPage() {
  const [stations, setStations] = useState<StationData[]>([]);
  const [selectedStation, setSelectedStation] = useState<StationData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<
    'all' | 'waqi' | 'openmeteo' | 'good' | 'moderate' | 'unhealthy'
  >('all');
  const [loading, setLoading] = useState(true);
  const [dataMode, setDataMode] = useState<string>('live');

  // Fetch real stations from API (Cakupan Seluruh Indonesia - WAQI + Open-Meteo)
  useEffect(() => {
    async function loadStations() {
      try {
        const res = await fetch('/api/air-quality/stations?south=-11.0&west=95.0&north=6.0&east=141.0');
        const json: ApiResponse<StationData[]> = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setStations(json.data);
          if (json.meta?.dataMode) {
            setDataMode(json.meta.dataMode);
          }
          if (json.data.length > 0) {
            setSelectedStation(json.data[0]);
          }
        }
      } catch (err) {
        console.error('Gagal memuat stasiun:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStations();
  }, []);

  // Filter stations based on search query, provider, and category
  const filteredStations = stations.filter((st) => {
    const matchesSearch =
      st.stationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (st.sourceName || '').toLowerCase().includes(searchQuery.toLowerCase());

    const aqi = st.aqi ?? Math.round((st.pm25Concentration ?? 25) * 2.2);

    let matchesCategory = true;
    if (filterCategory === 'good') matchesCategory = aqi <= 50;
    else if (filterCategory === 'moderate') matchesCategory = aqi > 50 && aqi <= 100;
    else if (filterCategory === 'unhealthy') matchesCategory = aqi > 100;
    else if (filterCategory === 'waqi') matchesCategory = st.dataType === 'station_observation' || (st.sourceName || '').includes('WAQI');
    else if (filterCategory === 'openmeteo') matchesCategory = st.dataType === 'model_fallback' || (st.sourceName || '').includes('Open-Meteo');

    return matchesSearch && matchesCategory;
  });

  // Ambil metadata kategori AQI stasiun terpilih
  const activeAqi = selectedStation
    ? selectedStation.aqi ?? Math.round((selectedStation.pm25Concentration ?? 25) * 2.2)
    : 50;
  const activeCategory =
    AQI_CATEGORIES.find((cat) => {
      if (cat.code === 'good' && activeAqi <= 50) return true;
      if (cat.code === 'moderate' && activeAqi > 50 && activeAqi <= 100) return true;
      if (cat.code === 'unhealthySensitive' && activeAqi > 100 && activeAqi <= 150) return true;
      if (cat.code === 'unhealthy' && activeAqi > 150 && activeAqi <= 200) return true;
      if (cat.code === 'veryUnhealthy' && activeAqi > 200 && activeAqi <= 300) return true;
      if (cat.code === 'hazardous' && activeAqi > 300) return true;
      return false;
    }) || AQI_CATEGORIES[0];

  const [mobileListOpen, setMobileListOpen] = useState(false);

  return (
    <div className="relative w-full h-[calc(100vh-56px)] mt-[56px] overflow-hidden bg-slate-100">
      {/* Simulation Banner Notice if active */}
      {dataMode === 'simulation' && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 bg-amber-500/90 backdrop-blur-md text-slate-950 font-bold px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[11px] sm:text-xs shadow-lg border border-amber-300 flex items-center gap-1.5 sm:gap-2 max-w-[calc(100vw-2rem)] truncate">
          <Zap className="w-3.5 h-3.5 fill-current shrink-0" />
          <span className="truncate">Mode Simulasi Aktif: Data stasiun pemantau pengujian.</span>
        </div>
      )}

      {/* 1. Real Leaflet Map */}
      <div className="w-full h-full absolute inset-0 z-0">
        <NavigationMap
          stations={filteredStations}
          activeStationId={selectedStation?.stationId}
          onSelectStation={(st) => {
            setSelectedStation(st);
            setMobileListOpen(false);
          }}
          center={selectedStation ? [selectedStation.lat, selectedStation.lng] : [-2.5, 118.0]}
          zoom={selectedStation ? 11 : 5}
        />
      </div>

      {/* 2A. Mobile-Only Compact Top Bar (Screens < md) */}
      <div className="md:hidden absolute top-2.5 inset-x-2.5 z-20 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white/95 backdrop-blur-md rounded-xl px-3 py-2 shadow-lg border border-slate-200/90 focus-within:border-emerald-500 transition">
          <SearchIcon size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari stasiun atau kota..."
            className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none font-medium"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 p-0.5">
              <CloseIcon size={14} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileListOpen(!mobileListOpen)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shadow-lg border transition whitespace-nowrap shrink-0 ${
            mobileListOpen
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white/95 text-slate-700 border-slate-200/90 hover:bg-slate-50'
          }`}
          aria-label={mobileListOpen ? 'Tutup daftar stasiun' : 'Buka daftar stasiun'}
        >
          {mobileListOpen ? (
            <>
              <CloseIcon size={14} />
              <span>Peta</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Daftar ({filteredStations.length})</span>
            </>
          )}
        </button>
      </div>

      {/* 2B. Desktop Sidebar OR Mobile Full Drawer when mobileListOpen is true */}
      <div
        className={`z-20 flex flex-col bg-white/95 backdrop-blur-md border border-slate-200/90 overflow-hidden transition-all duration-200 ${
          mobileListOpen
            ? 'fixed inset-x-2.5 top-14 bottom-20 rounded-2xl shadow-2xl flex md:hidden'
            : 'hidden md:flex absolute top-4 left-4 w-[400px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-5rem)] rounded-2xl shadow-2xl'
        }`}
      >
        {/* Search Bar (Desktop only, or Drawer Header on Mobile) */}
        <div className="p-3.5 border-b border-slate-200/80">
          <div className="hidden md:flex items-center gap-2 bg-slate-100 hover:bg-slate-100/80 focus-within:bg-white rounded-xl px-3 py-2 border border-slate-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition">
            <SearchIcon size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari stasiun atau kota di Indonesia..."
              className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none font-medium"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                <CloseIcon size={14} />
              </button>
            )}
          </div>

          {/* Mobile Drawer Header with Close action */}
          <div className="flex md:hidden items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Stasiun Pemantau Udara</h2>
              <span className="text-[11px] text-slate-500">{filteredStations.length} stasiun ditemukan</span>
            </div>
            <button
              onClick={() => setMobileListOpen(false)}
              className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs"
            >
              Lihat di Peta
            </button>
          </div>

          {/* Filter Chips (Termasuk WAQI & Open-Meteo) */}
          <div className="flex items-center gap-1.5 md:mt-2.5 overflow-x-auto pb-1 custom-scrollbar text-[11px]">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-2.5 py-1 rounded-full font-semibold border transition whitespace-nowrap flex-shrink-0 ${
                filterCategory === 'all'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
            >
              Semua ({stations.length})
            </button>
            <button
              onClick={() => setFilterCategory('waqi')}
              className={`px-2.5 py-1 rounded-full font-semibold border transition whitespace-nowrap flex-shrink-0 ${
                filterCategory === 'waqi'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
              }`}
            >
              WAQI Sensor
            </button>
            <button
              onClick={() => setFilterCategory('openmeteo')}
              className={`px-2.5 py-1 rounded-full font-semibold border transition whitespace-nowrap flex-shrink-0 ${
                filterCategory === 'openmeteo'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
              }`}
            >
              Open-Meteo Model
            </button>
            <button
              onClick={() => setFilterCategory('good')}
              className={`px-2.5 py-1 rounded-full font-semibold border transition whitespace-nowrap flex-shrink-0 ${
                filterCategory === 'good'
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              Baik (≤50)
            </button>
            <button
              onClick={() => setFilterCategory('moderate')}
              className={`px-2.5 py-1 rounded-full font-semibold border transition whitespace-nowrap flex-shrink-0 ${
                filterCategory === 'moderate'
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                  : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
              }`}
            >
              Sedang (51-100)
            </button>
            <button
              onClick={() => setFilterCategory('unhealthy')}
              className={`px-2.5 py-1 rounded-full font-semibold border transition whitespace-nowrap flex-shrink-0 ${
                filterCategory === 'unhealthy'
                  ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
            >
              Tidak Sehat (&gt;100)
            </button>
          </div>
        </div>

        {/* Station List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col gap-1.5">
          {filteredStations.length > 0 ? (
            filteredStations.map((st) => {
              const aqi = st.aqi ?? Math.round((st.pm25Concentration ?? 25) * 2.2);
              const isSelected = selectedStation?.stationId === st.stationId;
              const isModel = st.dataType === 'model_fallback' || (st.sourceName || '').includes('Open-Meteo');

              return (
                <button
                  key={st.stationId}
                  onClick={() => {
                    setSelectedStation(st);
                    setMobileListOpen(false);
                  }}
                  className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500/20'
                      : 'border-slate-100 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                        isModel ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}>
                        {isModel ? 'Open-Meteo' : 'WAQI'}
                      </span>
                      <strong className="block text-xs font-bold text-slate-800 truncate">
                        {st.stationName}
                      </strong>
                    </div>
                    <span className="text-[11px] text-slate-500 truncate block">
                      PM2.5: {(st.pm25Concentration ?? 0).toFixed(1)} µg/m³
                    </span>
                  </div>

                  {/* Single Line Stable AQI Badge */}
                  <span
                    className="px-2.5 py-1 rounded-full text-white font-bold text-xs shadow-sm flex items-center gap-1 whitespace-nowrap flex-shrink-0"
                    style={{
                      backgroundColor:
                        aqi <= 50 ? '#10b981' : aqi <= 100 ? '#f59e0b' : aqi <= 150 ? '#f97316' : '#ef4444',
                    }}
                  >
                    <span className="opacity-90">AQI</span>
                    <span>{aqi}</span>
                  </span>
                </button>
              );
            })
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">
              {loading ? 'Memuat stasiun udara...' : 'Tidak ada stasiun yang cocok dengan filter.'}
            </div>
          )}
        </div>
      </div>

      {/* 3. Floating Station Detail Card (Google Maps Place Info Style) */}
      {selectedStation && !mobileListOpen && (
        <div className="absolute bottom-18 left-2.5 right-2.5 md:bottom-6 md:left-[430px] md:right-auto md:w-96 z-20 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 p-4 transition-all animate-slide-down">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Stasiun Observasi Kualitas Udara
              </span>
              <h3 className="text-sm font-bold text-slate-900 leading-tight truncate">
                {selectedStation.stationName}
              </h3>
              <span className="text-xs text-slate-500 block truncate mt-0.5">
                {selectedStation.sourceName || 'Sumber Terverifikasi'} • Data Terkini
              </span>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Single Line Stable AQI Badge in Card Header */}
              <div
                className="px-3 py-1.5 rounded-xl text-white font-extrabold text-sm flex items-center gap-1.5 shadow-md whitespace-nowrap"
                style={{ backgroundColor: activeCategory.color }}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-90">AQI</span>
                <span className="text-base font-black">{activeAqi}</span>
              </div>

              {/* Close Button to Dismiss Detail Card */}
              <button
                type="button"
                onClick={() => setSelectedStation(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                aria-label="Tutup detail stasiun"
                title="Tutup info stasiun"
              >
                <CloseIcon size={16} />
              </button>
            </div>
          </div>

          {/* Pollutant Concentrations Grid */}
          <div className="grid grid-cols-2 gap-2 my-3 text-xs">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Konsentrasi PM2.5</span>
              <strong className="text-sm font-bold text-slate-800">{(selectedStation.pm25Concentration ?? 0).toFixed(1)} <small className="text-[10px]">µg/m³</small></strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Status Udara</span>
              <strong className="text-sm font-bold" style={{ color: activeCategory.color }}>{activeCategory.labelId}</strong>
            </div>
          </div>

          {/* Direct CTA: Rencanakan Rute ke Stasiun Ini */}
          <Link
            href={`/routes?destName=${encodeURIComponent(selectedStation.stationName)}&destLat=${selectedStation.lat}&destLng=${selectedStation.lng}`}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition"
          >
            <NavigationIcon size={14} />
            <span>Rencanakan Rute Bersih ke Sini</span>
          </Link>
        </div>
      )}

      {/* 4. Floating AQI Scale Legend (Google Maps Style Bottom Right) */}
      <div className="hidden lg:flex absolute bottom-6 right-16 z-10 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-slate-200/80 p-2.5 items-center gap-3 text-xs">
        <span className="text-slate-500 font-bold text-[11px]">Skala AQI:</span>
        <div className="flex items-center gap-1.5">
          {AQI_CATEGORIES.map((cat) => (
            <div key={cat.code} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ backgroundColor: cat.color }} />
              <span className="text-[10px] text-slate-600 font-medium">{cat.labelId}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
