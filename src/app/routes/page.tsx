'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  ClockIcon,
  CloseIcon,
  HistoryIcon,
  NavigationIcon,
  LeafLogo,
} from '@/components/common/Icons';
import type { ApiResponse } from '@/types/api';
import type { AnalyzeRoutesResponseData } from '@/types/analyze';
import type { RouteLabel } from '@/types/common';
import type { StationData } from '@/types/air-quality';
import type { GeocodeCandidate } from '@/lib/services/geocodingService';
import { formatDuration, formatExtraTime, formatDistance } from '@/lib/utils/formatters';
import { haversineDistanceMeters, pm25ToAqi } from '@/lib/algorithms';

// Dynamic import Leaflet NavigationMap untuk mencegah SSR issue di Next.js
const NavigationMap = dynamic(() => import('@/components/map/NavigationMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-500">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-600">Memuat Peta Navigasi Indonesia...</span>
      </div>
    </div>
  ),
});

// Shortcut titik populer di berbagai kota Indonesia untuk kemudahan navigasi 1-klik
const POPULAR_LOCATIONS = [
  { label: 'Jakarta (Monas)', lat: -6.1754, lng: 106.8272 },
  { label: 'Jakarta (Bundaran HI)', lat: -6.1950, lng: 106.8230 },
  { label: 'Bandung (Gedung Sate)', lat: -6.9025, lng: 107.6186 },
  { label: 'Semarang (Simpang Lima)', lat: -6.9928, lng: 110.4222 },
  { label: 'Yogyakarta (Malioboro)', lat: -7.7926, lng: 110.3658 },
  { label: 'Surabaya (Tugu Pahlawan)', lat: -7.2458, lng: 112.7378 },
  { label: 'Bali (Kuta)', lat: -8.7185, lng: 115.1686 },
  { label: 'Medan (Merdeka)', lat: 3.5908, lng: 98.6781 },
  { label: 'IKN Nusantara', lat: -0.9634, lng: 116.7088 },
];

export default function RoutePlannerPage() {
  // Input State
  const [originInput, setOriginInput] = useState('Simpang Lima, Semarang');
  const [destInput, setDestInput] = useState('Kampus Undip Tembalang, Semarang');
  const [originCoord, setOriginCoord] = useState({ lat: -6.9928, lng: 110.4222 });
  const [destCoord, setDestCoord] = useState({ lat: -7.0514, lng: 110.4388 });

  // Autocomplete Suggestions State
  const [originSuggestions, setOriginSuggestions] = useState<GeocodeCandidate[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<GeocodeCandidate[]>([]);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [searchingOrigin, setSearchingOrigin] = useState(false);
  const [searchingDest, setSearchingDest] = useState(false);

  // Preference State
  const [transportMode, setTransportMode] = useState<'car' | 'motorcycle' | 'walk'>('car');
  const [exposureWeight, setExposureWeight] = useState(0.8);
  const [extraTimeTolerance, setExtraTimeTolerance] = useState(30); // 30% max extra time

  // Result & Map State
  const [result, setResult] = useState<AnalyzeRoutesResponseData | null>(null);
  const [selectedRouteLabel, setSelectedRouteLabel] = useState<RouteLabel | null>('B');
  const [stations, setStations] = useState<StationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedTrip, setSavedTrip] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);

  const originInputRef = useRef<HTMLInputElement>(null);
  const destInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Real Stations on mount untuk visualisasi stasiun udara di peta
  useEffect(() => {
    async function loadStations() {
      try {
        const res = await fetch('/api/air-quality/stations');
        const json: ApiResponse<StationData[]> = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setStations(json.data);
        }
      } catch (err) {
        console.warn('Gagal memuat stasiun udara:', err);
      }
    }
    loadStations();
  }, []);

  // 2. Debounced Autocomplete untuk Origin
  useEffect(() => {
    if (originInput.trim().length < 3) {
      setOriginSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearchingOrigin(true);
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(originInput)}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setOriginSuggestions(json.data);
          setShowOriginDropdown(true);
        }
      } catch {
        // Abaikan error jaringan sesaat
      } finally {
        setSearchingOrigin(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [originInput]);

  // 3. Debounced Autocomplete untuk Destination
  useEffect(() => {
    if (destInput.trim().length < 3) {
      setDestSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearchingDest(true);
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(destInput)}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setDestSuggestions(json.data);
          setShowDestDropdown(true);
        }
      } catch {
        // Abaikan error jaringan sesaat
      } finally {
        setSearchingDest(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [destInput]);

  // 4. Trigger Initial Route Analysis saat pertama kali buka
  useEffect(() => {
    handleSearchRoutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handler Cari Rute ke Endpoint Real /api/routes/analyze
  const handleSearchRoutes = async () => {
    setLoading(true);
    setErrorMessage(null);
    setShowOriginDropdown(false);
    setShowDestDropdown(false);

    try {
      const res = await fetch('/api/routes/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: { lat: originCoord.lat, lng: originCoord.lng },
          destination: { lat: destCoord.lat, lng: destCoord.lng },
          preferences: {
            exposureWeight,
            maxExtraTimePercent: extraTimeTolerance,
          },
        }),
      });

      const json: ApiResponse<AnalyzeRoutesResponseData> = await res.json();

      if (json.success && json.data) {
        setResult(json.data);
        // Default pilih rute yang direkomendasikan sistem
        setSelectedRouteLabel(json.data.recommendedRouteLabel || json.data.routes[0]?.label || 'A');
        setShowDetailsDrawer(true);
      } else {
        setErrorMessage(json.error?.message || 'Gagal menghitung rute alternatif.');
      }
    } catch (err) {
      console.error('Error mencari rute:', err);
      setErrorMessage('Terjadi kendala jaringan saat menghubungi layanan navigasi.');
    } finally {
      setLoading(false);
    }
  };

  // Handler Swap Lokasi Asal & Tujuan
  const handleSwap = () => {
    const tempInput = originInput;
    const tempCoord = originCoord;
    setOriginInput(destInput);
    setOriginCoord(destCoord);
    setDestInput(tempInput);
    setDestCoord(tempCoord);
  };

  // Pilih Kandidat Rute Terpilih
  const activeRoute = result?.routes.find((r) => r.label === selectedRouteLabel) || result?.routes[0];
  const recommendedRoute = result?.routes.find((r) => r.label === result?.recommendedRouteLabel) || result?.routes[0];
  const fastestRoute = result?.routes.find((r) => r.isFastest) || result?.routes[0];

  // Stasiun kualitas udara terdekat yang dilalui rute terpilih
  const routeStations = React.useMemo(() => {
    if (!activeRoute) return [];

    // 1. Ambil stasiun yang dilalui dari hasil algoritma IDW rute
    if (activeRoute.estimate?.stationsUsed && activeRoute.estimate.stationsUsed.length > 0) {
      return activeRoute.estimate.stationsUsed.map((st) => ({
        stationId: st.stationId,
        stationName: st.stationName,
        distanceMeters: st.distanceMeters,
        pm25: st.pm25,
        dataType: st.dataType,
      }));
    }

    // 2. Fallback cerdas: jika stationsUsed belum terisi, cari 3 stasiun terdekat dari titik koridor rute
    if (stations.length > 0) {
      const coords = (activeRoute.geometry?.coordinates as [number, number][]) || [];
      const samplePoints: [number, number][] =
        coords.length > 0
          ? [coords[0], coords[Math.floor(coords.length / 2)], coords[coords.length - 1]]
          : [
              [originCoord.lat, originCoord.lng],
              [destCoord.lat, destCoord.lng],
            ];

      return stations
        .map((st) => {
          let minDistance = Infinity;
          for (const [lat, lng] of samplePoints) {
            const d = haversineDistanceMeters(st.lat, st.lng, lat, lng);
            if (d < minDistance) minDistance = d;
          }
          return {
            stationId: st.stationId,
            stationName: st.stationName,
            distanceMeters: minDistance,
            pm25: st.pm25Concentration ?? 25,
            dataType: st.dataType,
          };
        })
        .sort((a, b) => a.distanceMeters - b.distanceMeters)
        .slice(0, 3);
    }

    return [];
  }, [activeRoute, stations, originCoord, destCoord]);

  return (
    <div className="relative w-full h-[calc(100vh-56px)] mt-[56px] overflow-hidden bg-slate-100">
      {/* 1. Real Interactive Leaflet Navigation Map */}
      <div className="w-full h-full absolute inset-0 z-0">
        <NavigationMap
          origin={{ lat: originCoord.lat, lng: originCoord.lng, label: originInput }}
          destination={{ lat: destCoord.lat, lng: destCoord.lng, label: destInput }}
          routes={result?.routes || []}
          selectedRouteLabel={selectedRouteLabel}
          onSelectRoute={(label) => setSelectedRouteLabel(label)}
          stations={stations}
        />
      </div>

      {/* 2. Google Maps Style Floating Directions Sidebar Panel */}
      <div className="absolute top-4 left-4 z-20 w-[420px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-5rem)] flex flex-col bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden">
        {/* Mode Selector Tabs (Google Maps Style) */}
        <div className="flex items-center justify-around border-b border-slate-200/80 bg-slate-50/70 py-2 px-3">
          <button
            onClick={() => setTransportMode('car')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              transportMode === 'car'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🚗</span>
            <span>Mobil</span>
          </button>
          <button
            onClick={() => setTransportMode('motorcycle')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              transportMode === 'motorcycle'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🛵</span>
            <span>Motor</span>
          </button>
          <button
            onClick={() => setTransportMode('walk')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              transportMode === 'walk'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🚶</span>
            <span>Pejalan</span>
          </button>
        </div>

        {/* Directions Search Box */}
        <div className="p-4 border-b border-slate-200/80 relative">
          <div className="flex items-center gap-3">
            {/* Visual Dots & Connector */}
            <div className="flex flex-col items-center justify-between h-[76px] py-2">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500 bg-white shadow-sm" />
              <span className="w-0.5 h-6 bg-slate-300 border-dashed" />
              <span className="w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white shadow-sm" />
            </div>

            {/* Input Fields */}
            <div className="flex-1 flex flex-col gap-2 relative">
              {/* Origin Input */}
              <div className="relative">
                <input
                  ref={originInputRef}
                  type="text"
                  value={originInput}
                  onChange={(e) => setOriginInput(e.target.value)}
                  onFocus={() => setShowOriginDropdown(true)}
                  placeholder="Pilih titik keberangkatan..."
                  className="w-full bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-slate-800 text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                />
                {searchingOrigin && (
                  <span className="absolute right-2.5 top-2.5 w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                )}

                {/* Autocomplete Dropdown Origin */}
                {showOriginDropdown && originSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-30 max-h-48 overflow-y-auto custom-scrollbar">
                    {originSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setOriginInput(item.label.split(',')[0]);
                          setOriginCoord({ lat: item.lat, lng: item.lng });
                          setShowOriginDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 border-b border-slate-100 last:border-none flex items-start gap-2 text-slate-700"
                      >
                        <span className="text-slate-400 mt-0.5">📍</span>
                        <span className="line-clamp-2">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Destination Input */}
              <div className="relative">
                <input
                  ref={destInputRef}
                  type="text"
                  value={destInput}
                  onChange={(e) => setDestInput(e.target.value)}
                  onFocus={() => setShowDestDropdown(true)}
                  placeholder="Pilih tujuan..."
                  className="w-full bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-slate-800 text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                />
                {searchingDest && (
                  <span className="absolute right-2.5 top-2.5 w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                )}

                {/* Autocomplete Dropdown Destination */}
                {showDestDropdown && destSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-30 max-h-48 overflow-y-auto custom-scrollbar">
                    {destSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setDestInput(item.label.split(',')[0]);
                          setDestCoord({ lat: item.lat, lng: item.lng });
                          setShowDestDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 border-b border-slate-100 last:border-none flex items-start gap-2 text-slate-700"
                      >
                        <span className="text-rose-400 mt-0.5">📍</span>
                        <span className="line-clamp-2">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Swap Button */}
            <button
              onClick={handleSwap}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition"
              title="Tukar Titik Asal & Tujuan"
              aria-label="Tukar Titik"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          {/* Quick Presets Chips */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-[11px]">
            <span className="text-slate-400 font-medium whitespace-nowrap">Cepat:</span>
            {POPULAR_LOCATIONS.map((loc) => (
              <button
                key={loc.label}
                type="button"
                onClick={() => {
                  setDestInput(loc.label);
                  setDestCoord({ lat: loc.lat, lng: loc.lng });
                }}
                className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 text-slate-600 whitespace-nowrap transition"
              >
                {loc.label}
              </button>
            ))}
          </div>

          {/* Optimization Preferences Slider */}
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-600 font-medium">Prioritas Optimasi:</span>
              <span className="font-bold text-emerald-600">
                {exposureWeight === 0
                  ? 'Tercepat (0%)'
                  : exposureWeight >= 0.8
                  ? 'Udara Bersih (80%)'
                  : 'Seimbang (50%)'}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={exposureWeight}
              onChange={(e) => setExposureWeight(parseFloat(e.target.value))}
              className="w-full accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Waktu Tempuh</span>
              <span>Minim Polusi</span>
            </div>
          </div>

          {/* Cari Rute Button */}
          <button
            onClick={handleSearchRoutes}
            disabled={loading}
            className="w-full mt-3 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Menghitung Rute &amp; Polusi...</span>
              </>
            ) : (
              <>
                <NavigationIcon size={14} />
                <span>Cari Rute &amp; Analisis Polusi</span>
              </>
            )}
          </button>

          {errorMessage && (
            <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-xs">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Route Candidates List (Google Maps Style) */}
        <div className="p-3 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2">
          {result ? (
            <>
              <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-semibold mb-1">
                <span>Pilihan Alternatif Rute</span>
                <span>{result.routes.length} rute ditemukan</span>
              </div>

              {/* Rute A / B / C Cards */}
              {result.routes.map((route) => {
                const isSelected = route.label === selectedRouteLabel;
                const isRecommended = route.label === result.recommendedRouteLabel;
                const isCleanAir = !route.isFastest;
                const durationFormatted = formatDuration(route.durationSeconds);
                const km = formatDistance(route.distanceMeters);
                const exposureSaved =
                  route.comparison.exposureDeltaPercent != null
                    ? Math.abs(Math.round(route.comparison.exposureDeltaPercent))
                    : null;
                const stationsCount = route.estimate?.stationsUsed?.length || 0;

                return (
                  <button
                    key={route.id}
                    onClick={() => {
                      setSelectedRouteLabel(route.label);
                      setShowDetailsDrawer(true);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-1.5 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/60 shadow-md ring-1 ring-emerald-500/30'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            isCleanAir ? 'bg-emerald-500' : 'bg-blue-600'
                          }`}
                        />
                        <strong className="text-sm font-bold text-slate-800">
                          Rute {route.label} {isCleanAir ? '— Alternatif Bersih' : '— Tercepat'}
                        </strong>
                      </div>
                      {isRecommended && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-wide">
                          Rekomendasi
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-600 font-medium flex-wrap">
                      <span className="text-base font-extrabold text-slate-900 whitespace-nowrap">
                        {durationFormatted}
                      </span>
                      <span>•</span>
                      <span className="whitespace-nowrap">{km}</span>
                      {route.comparison.extraSeconds > 0 && (
                        <span className="text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded text-[11px] whitespace-nowrap">
                          {formatExtraTime(route.comparison.extraSeconds)}
                        </span>
                      )}
                      {stationsCount > 0 && (
                        <span className="text-slate-500 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded whitespace-nowrap ml-auto">
                          📡 {stationsCount} stasiun dilalui
                        </span>
                      )}
                    </div>

                    {/* Metrik Polusi */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                      <span className="text-slate-500">Estimasi Paparan:</span>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-slate-800 font-bold whitespace-nowrap">
                          {route.estimate.exposureIndexPm25 ?? '-'} <small className="text-[10px]">µg/m³·mnt</small>
                        </strong>
                        {exposureSaved != null && exposureSaved > 0 && isCleanAir && (
                          <span className="text-emerald-700 font-bold text-[11px] bg-emerald-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                            ↓ {exposureSaved}% Lebih Bersih
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              <span>Masukkan titik asal &amp; tujuan, lalu klik <strong>&quot;Cari Rute&quot;</strong>.</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Google Maps Style Bottom / Floating Route Details Card */}
      {showDetailsDrawer && activeRoute && (
        <div className="absolute bottom-6 left-4 right-4 md:left-[450px] md:right-8 z-20 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 p-4 transition-all animate-slide-down max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px] whitespace-nowrap">
                  Rute {activeRoute.label} Terpilih
                </span>
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                  {formatDuration(activeRoute.durationSeconds)} ({formatDistance(activeRoute.distanceMeters)})
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 leading-snug">
                {result?.explanation.text || 'Rute alternatif ini memprioritaskan koridor udara dengan konsentrasi PM2.5 lebih rendah.'}
              </h3>
            </div>

            <button
              onClick={() => setShowDetailsDrawer(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              aria-label="Tutup Detail"
            >
              <CloseIcon size={18} />
            </button>
          </div>

          {/* Stasiun Kualitas Udara Terdekat yang Dilalui */}
          {routeStations.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <span>📡</span>
                  <span>Stasiun Kualitas Udara Terdekat yang Dilalui</span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {routeStations.length} stasiun terpantau
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {routeStations.map((st, idx) => {
                  const aqi = pm25ToAqi(st.pm25) ?? Math.round(st.pm25 * 2.2);
                  const isModel =
                    st.dataType === 'model_fallback' ||
                    (st.stationName || '').includes('Open-Meteo') ||
                    (st.stationName || '').includes('Model');

                  let aqiColor = '#10b981';
                  if (aqi > 300) aqiColor = '#7f1d1d';
                  else if (aqi > 200) aqiColor = '#8b5cf6';
                  else if (aqi > 150) aqiColor = '#ef4444';
                  else if (aqi > 100) aqiColor = '#f97316';
                  else if (aqi > 50) aqiColor = '#f59e0b';

                  return (
                    <div
                      key={st.stationId || idx}
                      className="p-2.5 rounded-xl bg-slate-50/90 hover:bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                              isModel
                                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                : 'bg-blue-100 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {isModel ? 'Open-Meteo' : 'WAQI'}
                          </span>
                          <strong className="text-slate-800 font-semibold truncate block">
                            {st.stationName}
                          </strong>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 truncate">
                          <span>{formatDistance(st.distanceMeters)} dari rute</span>
                          <span>•</span>
                          <span>PM2.5: {st.pm25.toFixed(1)} µg/m³</span>
                        </div>
                      </div>

                      {/* Single Line Stable AQI Badge */}
                      <span
                        className="px-2 py-0.5 rounded-full text-white font-bold text-xs shadow-xs flex items-center gap-1 whitespace-nowrap flex-shrink-0"
                        style={{ backgroundColor: aqiColor }}
                      >
                        <span className="opacity-90">AQI</span>
                        <span>{aqi}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actionable Health Mitigation Tips */}
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {(result?.actionMessages || [
              {
                ruleId: 'RULE-01',
                message: 'Tutup rapat kaca jendela kendaraan di area jalan padat.',
                basis: 'Menghindari paparan partikulat PM2.5 tinggi.',
              },
              {
                ruleId: 'RULE-02',
                message: 'Gunakan mode resirkulasi udara AC.',
                basis: 'Mencegah infiltrasi asap knalpot luar ke dalam kabin.',
              },
            ]).map((msg) => (
              <div key={msg.ruleId} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">🛡️</span>
                <div>
                  <strong className="block text-slate-800 font-semibold">{msg.message}</strong>
                  <span className="text-[11px] text-slate-500">{msg.basis}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons: Export to Google Maps & Save Trip */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              onClick={() => {
                const url = `https://www.google.com/maps/dir/?api=1&origin=${originCoord.lat},${originCoord.lng}&destination=${destCoord.lat},${destCoord.lng}&travelmode=driving`;
                window.open(url, '_blank');
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-sm"
            >
              <NavigationIcon size={14} />
              <span>Buka Petunjuk di Google Maps ↗</span>
            </button>

            <button
              onClick={() => setSavedTrip(!savedTrip)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition ${
                savedTrip
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <HistoryIcon size={14} />
              <span>{savedTrip ? 'Tersimpan di Riwayat ✓' : 'Simpan Perjalanan'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
