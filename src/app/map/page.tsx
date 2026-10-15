/**
 * @file page.tsx
 * @description Halaman Peta Kualitas Udara Kota P-02 untuk AANG.
 * Menampilkan sebaran stasiun pemantau, panel detail polutan, dan integrasi peta interaktif (TC-33).
 * 
 * @author Person 3 (Database, Auth, & History Services)
 * @module app/map/page
 * @see CODE_SPEC_AANG.md Bagian 8.1 & FR-02, TC-33
 */

'use client';

import React, { useState } from 'react';
import {
  MapPin,
  Search,
  AlertTriangle,
  RotateCw,
  Info,
} from 'lucide-react';
import { useStations } from '@/components/air-map/useStations';
import { StationDetailPanel } from '@/components/air-map/StationDetailPanel';
import { AirQualityMap } from '@/components/air-map/AirQualityMap';

export default function AirQualityMapPage() {
  const {
    stations,
    loading,
    error,
    selectedStation,
    setSelectedStation,
    fetchStations,
    dataMode,
  } = useStations();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'detail'>('list');

  // Filter stasiun berdasarkan pencarian teks
  const filteredStations = stations.filter((st) =>
    st.stationName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isSimulation = dataMode === 'simulation';

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-950 text-white overflow-hidden">
      {/* Simulation Banner Notice if active */}
      {isSimulation && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-300 flex items-center justify-between gap-2 z-30 shrink-0">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Mode Simulasi Aktif:</strong> Menampilkan data sintetis stasiun pilot
              Semarang untuk pengujian reliabilitas & demo juri.
            </span>
          </div>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-amber-500/20 text-[10px] font-bold">
            DATA_MODE=simulation
          </span>
        </div>
      )}

      {/* Main Split Layout: Sidebar + Interactive Map */}
      <div className="flex flex-col md:flex-row flex-1 relative overflow-hidden">
        {/* Left Side Panel: Station List & Detail Panel */}
        <div className="w-full md:w-[420px] bg-slate-900/95 border-r border-slate-800 flex flex-col z-20 shrink-0 shadow-2xl backdrop-blur-xl max-h-[45vh] md:max-h-full">
          {/* Header Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
              <MapPin className="w-4 h-4" />
              <span>Kota Pilot Semarang</span>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">
              Peta Kualitas Udara
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Pantau sebaran {stations.length} stasiun pemantau resmi & sensor jaringan kota.
            </p>

            {/* Mobile Tab Toggle */}
            <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl mt-3 md:hidden">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab === 'list'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Daftar ({stations.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('detail')}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab === 'detail'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Rincian Stasiun
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="p-3 border-b border-slate-800/60 bg-slate-950/40">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama stasiun atau lokasi..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Scrollable Content: List / Detail */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading && stations.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                <RotateCw className="w-4 h-4 animate-spin text-emerald-500" />
                <span>Memuat sebaran stasiun pemantau...</span>
              </div>
            ) : error ? (
              <div className="p-4 bg-rose-950/60 border border-rose-800 rounded-2xl text-rose-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Gagal Mengambil Data:</strong>
                  <span>{error}</span>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop View: Detail Panel on Top (if selected) + List below, OR Tabbed on mobile */}
                <div className={`${activeTab === 'detail' ? 'block' : 'hidden md:block'}`}>
                  {selectedStation && (
                    <div className="mb-4 pb-4 border-b border-slate-800/80">
                      <StationDetailPanel station={selectedStation} />
                    </div>
                  )}
                </div>

                <div className={`${activeTab === 'list' ? 'block' : 'hidden md:block'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Daftar Stasiun Terdeteksi
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {filteredStations.length} stasiun
                    </span>
                  </div>

                  {filteredStations.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500">
                      Tidak ada stasiun yang cocok dengan pencarian &quot;{searchQuery}&quot;.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredStations.map((st) => {
                        const isSelected = selectedStation?.stationId === st.stationId;
                        return (
                          <div
                            key={st.stationId}
                            onClick={() => {
                              setSelectedStation(st);
                              setActiveTab('detail');
                            }}
                            className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-slate-800/90 border-emerald-500 shadow-lg shadow-emerald-500/10'
                                : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-white truncate">
                                {st.stationName}
                              </h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                PM2.5:{' '}
                                <strong className="text-slate-200">
                                  {st.pm25Concentration !== null
                                    ? `${st.pm25Concentration.toFixed(1)} µg/m³`
                                    : 'N/A'}
                                </strong>{' '}
                                • {st.sourceName}
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-lg text-xs font-black ${
                                  st.aqi && st.aqi <= 50
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/60'
                                    : st.aqi && st.aqi <= 100
                                    ? 'bg-yellow-950 text-yellow-400 border border-yellow-700/60'
                                    : 'bg-orange-950 text-orange-400 border border-orange-700/60'
                                }`}
                              >
                                AQI {st.aqi ?? '—'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Section: Interactive Leaflet Map Container */}
        <div className="flex-1 relative h-full">
          <AirQualityMap
            stations={stations}
            selectedStation={selectedStation}
            onSelectStation={(st) => {
              setSelectedStation(st);
              setActiveTab('detail');
            }}
            onBoundsChange={(bounds) => {
              fetchStations(bounds);
            }}
          />
        </div>
      </div>
    </div>
  );
}
