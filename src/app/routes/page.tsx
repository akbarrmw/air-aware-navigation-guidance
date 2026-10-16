'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import {
  ClockIcon,
  CloseIcon,
  HistoryIcon,
  NavigationIcon,
  LeafLogo,
  PlusIcon,
} from '@/components/common/Icons';
import {
  Car,
  Bike,
  Footprints,
  MapPin,
  Timer,
  Leaf,
  Radio,
  ShieldCheck,
  ExternalLink,
  Check,
} from 'lucide-react';
import type { ApiResponse } from '@/types/api';
import type { AnalyzeRoutesResponseData } from '@/types/analyze';
import type { RouteLabel } from '@/types/common';
import type { StationData } from '@/types/air-quality';
import type { TripSavePayload } from '@/types/trips';
import { saveTripToHistory } from '@/lib/client/tripsApi';
import type { GeocodeCandidate } from '@/lib/services/geocodingService';
import { formatDuration, formatExtraTime, formatDistance } from '@/lib/utils/formatters';
import { haversineDistanceMeters, pm25ToAqi } from '@/lib/algorithms';
import { decideRoutes } from '@/lib/algorithms/decide';

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
  { label: 'Semarang (Undip Tembalang)', lat: -7.0515, lng: 110.4395 },
  { label: 'Semarang (Simpang Lima)', lat: -6.9928, lng: 110.4222 },
  { label: 'Jakarta (Monas)', lat: -6.1754, lng: 106.8272 },
  { label: 'Jakarta (Bundaran HI)', lat: -6.1950, lng: 106.8230 },
  { label: 'Bandung (Gedung Sate)', lat: -6.9025, lng: 107.6186 },
  { label: 'Yogyakarta (Malioboro)', lat: -7.7926, lng: 110.3658 },
  { label: 'Surabaya (Tugu Pahlawan)', lat: -7.2458, lng: 112.7378 },
  { label: 'Bali (Kuta)', lat: -8.7185, lng: 115.1686 },
  { label: 'Medan (Merdeka)', lat: 3.5908, lng: 98.6781 },
  { label: 'IKN Nusantara', lat: -0.9634, lng: 116.7088 },
];

export interface WaypointItem {
  id: string;
  input: string;
  coord: { lat: number; lng: number } | null;
  suggestions: GeocodeCandidate[];
  searching: boolean;
}

function RoutePlannerContent() {
  const searchParams = useSearchParams();
  const destNameParam = searchParams?.get('destName');
  const destLatParam = searchParams?.get('destLat');
  const destLngParam = searchParams?.get('destLng');

  // Input State (Form input pengguna yang sedang diedit)
  const [originInput, setOriginInput] = useState('');
  const [destInput, setDestInput] = useState('');
  const [originCoord, setOriginCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [destCoord, setDestCoord] = useState<{ lat: number; lng: number } | null>(null);

  // Waypoints / Titik Singgah State (Maksimal 5)
  const [waypoints, setWaypoints] = useState<WaypointItem[]>([]);

  // Applied Map State (Titik A, Waypoints, dan B di peta Leaflet yang HANYA diperbarui saat klik 'Cari Rute')
  const [appliedOrigin, setAppliedOrigin] = useState<{ lat: number; lng: number; label?: string } | null>(null);
  const [appliedDestination, setAppliedDestination] = useState<{ lat: number; lng: number; label?: string } | null>(null);
  const [appliedWaypoints, setAppliedWaypoints] = useState<Array<{ lat: number; lng: number; label?: string }>>([]);

  // Autocomplete Suggestions State (mutually exclusive)
  const [originSuggestions, setOriginSuggestions] = useState<GeocodeCandidate[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<GeocodeCandidate[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [searchingOrigin, setSearchingOrigin] = useState(false);
  const [searchingDest, setSearchingDest] = useState(false);

  // Ref untuk mencegah loop trigger pencarian ulang saat pengguna baru saja memilih dari dropdown
  const skipOriginSearchRef = useRef(false);
  const skipDestSearchRef = useRef(false);

  // Preference State (Diskrit: 0, 25, 50, 75, 100)
  const [transportMode, setTransportMode] = useState<'car' | 'motorcycle' | 'walk'>('car');
  const [exposureWeight, setExposureWeight] = useState(50); // Default 50% (Seimbang)
  const [extraTimeTolerance, setExtraTimeTolerance] = useState(30); // 30% max extra time

  // Result & Map State
  const [result, setResult] = useState<AnalyzeRoutesResponseData | null>(null);
  const [selectedRouteLabel, setSelectedRouteLabel] = useState<RouteLabel | null>(null);
  const [stations, setStations] = useState<StationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedTrip, setSavedTrip] = useState(false);
  const [savingTrip, setSavingTrip] = useState(false);
  const [saveTripError, setSaveTripError] = useState<string | null>(null);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);

  const originInputRef = useRef<HTMLInputElement>(null);
  const destInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Handler Pemilihan Titik Asal dari Autocomplete
  const handleSelectOrigin = (item: GeocodeCandidate) => {
    skipOriginSearchRef.current = true;
    setOriginInput(item.label);
    setOriginCoord({ lat: item.lat, lng: item.lng });
    setOriginSuggestions([]);
    setActiveDropdown(null);
  };

  // Handler Pemilihan Titik Tujuan dari Autocomplete
  const handleSelectDest = (item: GeocodeCandidate) => {
    skipDestSearchRef.current = true;
    setDestInput(item.label);
    setDestCoord({ lat: item.lat, lng: item.lng });
    setDestSuggestions([]);
    setActiveDropdown(null);
  };

  // Handler Tambah Titik Singgah (Maksimal 5)
  const handleAddWaypoint = () => {
    if (waypoints.length >= 5) return;
    const newId = `wp-${Date.now()}`;
    setWaypoints((prev) => [
      ...prev,
      {
        id: newId,
        input: '',
        coord: null,
        suggestions: [],
        searching: false,
      },
    ]);
    setActiveDropdown(`waypoint-${newId}`);
  };

  // Handler Hapus Titik Singgah
  const handleRemoveWaypoint = (id: string) => {
    setWaypoints((prev) => prev.filter((wp) => wp.id !== id));
    if (activeDropdown === `waypoint-${id}`) {
      setActiveDropdown(null);
    }
  };

  // Handler Perubahan Input Titik Singgah
  const handleWaypointInputChange = (id: string, value: string) => {
    setWaypoints((prev) =>
      prev.map((wp) => (wp.id === id ? { ...wp, input: value, coord: null } : wp))
    );
    setActiveDropdown(`waypoint-${id}`);
  };

  // Handler Pemilihan Titik Singgah dari Autocomplete
  const handleSelectWaypoint = (id: string, item: GeocodeCandidate) => {
    setWaypoints((prev) =>
      prev.map((wp) =>
        wp.id === id
          ? {
              ...wp,
              input: item.label,
              coord: { lat: item.lat, lng: item.lng },
              suggestions: [],
              searching: false,
            }
          : wp
      )
    );
    setActiveDropdown(null);
  };

  // Listener tutup dropdown saat klik di luar area pencarian
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Baca query parameter dari URL saat diarahkan dari peta polusi (/map)
  useEffect(() => {
    if (destNameParam && destLatParam && destLngParam) {
      const lat = parseFloat(destLatParam);
      const lng = parseFloat(destLngParam);
      if (!isNaN(lat) && !isNaN(lng)) {
        skipDestSearchRef.current = true;
        setDestInput(destNameParam);
        setDestCoord({ lat, lng });
        setDestSuggestions([]);
        setActiveDropdown(null);
        // Kosongkan origin dan fokuskan pengguna untuk mengisi titik keberangkatan
        setOriginInput('');
        setOriginCoord(null);
        setTimeout(() => {
          originInputRef.current?.focus();
        }, 300);
      }
    }
  }, [destNameParam, destLatParam, destLngParam]);

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
    if (skipOriginSearchRef.current) {
      skipOriginSearchRef.current = false;
      return;
    }
    if (originInput.trim().length < 2) {
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
          setActiveDropdown((curr) => (curr === 'destination' ? 'destination' : 'origin'));
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
    if (skipDestSearchRef.current) {
      skipDestSearchRef.current = false;
      return;
    }
    if (destInput.trim().length < 2) {
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
          setActiveDropdown((curr) => (curr === 'origin' ? 'origin' : 'destination'));
        }
      } catch {
        // Abaikan error jaringan sesaat
      } finally {
        setSearchingDest(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [destInput]);

  // Debounce Autocomplete untuk Waypoints / Titik Singgah
  useEffect(() => {
    if (!activeDropdown || !activeDropdown.startsWith('waypoint-')) return;
    const wpId = activeDropdown.replace('waypoint-', '');
    const wp = waypoints.find((w) => w.id === wpId);
    if (!wp || !wp.input.trim() || wp.input.length < 2 || wp.coord) return;

    const timer = setTimeout(async () => {
      try {
        setWaypoints((prev) =>
          prev.map((w) => (w.id === wpId ? { ...w, searching: true } : w))
        );
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(wp.input)}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setWaypoints((prev) =>
            prev.map((w) => (w.id === wpId ? { ...w, suggestions: json.data, searching: false } : w))
          );
        }
      } catch {
        setWaypoints((prev) =>
          prev.map((w) => (w.id === wpId ? { ...w, searching: false } : w))
        );
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [waypoints, activeDropdown]);

  // Handler Cari Rute ke Endpoint Real /api/routes/analyze
  // Handler Cari Rute ke Endpoint Real /api/routes/analyze
  const handleSearchRoutes = async (targetMode?: 'car' | 'motorcycle' | 'walk') => {
    setActiveDropdown(null);
    setErrorMessage(null);

    const activeMode = targetMode || transportMode;

    if (!originInput.trim() || !destInput.trim()) {
      setErrorMessage('Silakan tentukan titik keberangkatan dan titik tujuan terlebih dahulu.');
      return;
    }

    setLoading(true);

    try {
      // 1. Resolve koordinat asal jika pengguna mengetik tanpa klik dropdown
      let currentOriginCoord = originCoord;
      if (!currentOriginCoord) {
        try {
          const res = await fetch(`/api/geocode?q=${encodeURIComponent(originInput)}`);
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            currentOriginCoord = { lat: json.data[0].lat, lng: json.data[0].lng };
            setOriginCoord(currentOriginCoord);
          } else {
            setErrorMessage('Titik awal tidak ditemukan. Silakan pilih lokasi dari saran yang muncul.');
            setLoading(false);
            return;
          }
        } catch {
          setErrorMessage('Gagal mencari koordinat titik awal.');
          setLoading(false);
          return;
        }
      }

      // 2. Resolve koordinat titik singgah (waypoints) jika diisi
      const resolvedWaypoints: Array<{ lat: number; lng: number; label: string }> = [];
      for (let i = 0; i < waypoints.length; i++) {
        const wp = waypoints[i];
        if (!wp.input.trim()) continue;

        let currentWpCoord = wp.coord;
        if (!currentWpCoord) {
          try {
            const res = await fetch(`/api/geocode?q=${encodeURIComponent(wp.input)}`);
            const json = await res.json();
            if (json.success && Array.isArray(json.data) && json.data.length > 0) {
              currentWpCoord = { lat: json.data[0].lat, lng: json.data[0].lng };
            } else {
              setErrorMessage(`Titik singgah ${i + 1} tidak ditemukan. Silakan pilih dari saran lokasi.`);
              setLoading(false);
              return;
            }
          } catch {
            setErrorMessage(`Gagal mencari koordinat titik singgah ${i + 1}.`);
            setLoading(false);
            return;
          }
        }

        resolvedWaypoints.push({
          lat: currentWpCoord.lat,
          lng: currentWpCoord.lng,
          label: wp.input,
        });
      }

      // 3. Resolve koordinat tujuan jika pengguna mengetik tanpa klik dropdown
      let currentDestCoord = destCoord;
      if (!currentDestCoord) {
        try {
          const res = await fetch(`/api/geocode?q=${encodeURIComponent(destInput)}`);
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            currentDestCoord = { lat: json.data[0].lat, lng: json.data[0].lng };
            setDestCoord(currentDestCoord);
          } else {
            setErrorMessage('Titik tujuan tidak ditemukan. Silakan pilih lokasi dari saran yang muncul.');
            setLoading(false);
            return;
          }
        } catch {
          setErrorMessage('Gagal mencari koordinat titik tujuan.');
          setLoading(false);
          return;
        }
      }

      const effectiveTolerance =
        exposureWeight === 100 ? 50 : exposureWeight === 75 ? 40 : extraTimeTolerance;

      const res = await fetch('/api/routes/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: { lat: currentOriginCoord.lat, lng: currentOriginCoord.lng, label: originInput },
          destination: { lat: currentDestCoord.lat, lng: currentDestCoord.lng, label: destInput },
          waypoints: resolvedWaypoints,
          preferences: {
            exposureWeight: exposureWeight / 100,
            maxExtraTimePercent: effectiveTolerance,
          },
          transportMode: activeMode,
        }),
      });

      const json: ApiResponse<AnalyzeRoutesResponseData> = await res.json();

      if (json.success && json.data) {
        setResult(json.data);
        // Terapkan titik A, waypoints, dan B ke peta hanya saat tombol 'Cari Rute' diklik & berhasil dihitung
        setAppliedOrigin({ lat: currentOriginCoord.lat, lng: currentOriginCoord.lng, label: originInput });
        setAppliedDestination({ lat: currentDestCoord.lat, lng: currentDestCoord.lng, label: destInput });
        setAppliedWaypoints(resolvedWaypoints);
        // Default pilih rute yang direkomendasikan sistem
        setSelectedRouteLabel(json.data.recommendedRouteLabel || json.data.routes[0]?.label || 'A');
        setShowDetailsDrawer(true);
        setSavedTrip(false);
        setSaveTripError(null);
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

  // Handler Simpan Rute Terpilih ke Riwayat Database (FR-11)
  const handleSaveTrip = async () => {
    if (!result || !result.routes || result.routes.length === 0 || !appliedOrigin || !appliedDestination) {
      return;
    }
    const currentRoute = result.routes.find((r) => r.label === selectedRouteLabel) || result.routes[0];
    const fastestRoute = result.routes.find((r) => r.isFastest) || result.routes[0];

    const payload: TripSavePayload = {
      origin: {
        label: appliedOrigin.label || originInput || `${appliedOrigin.lat.toFixed(4)}, ${appliedOrigin.lng.toFixed(4)}`,
        lat: appliedOrigin.lat,
        lng: appliedOrigin.lng,
      },
      destination: {
        label: appliedDestination.label || destInput || `${appliedDestination.lat.toFixed(4)}, ${appliedDestination.lng.toFixed(4)}`,
        lat: appliedDestination.lat,
        lng: appliedDestination.lng,
      },
      selectedRoute: currentRoute,
      fastest: {
        durationSeconds: fastestRoute.durationSeconds,
        exposureIndexPm25: fastestRoute.estimate.exposureIndexPm25,
      },
      wasRecommended: result.recommendedRouteLabel === currentRoute.label,
      usedExposureWeight: exposureWeight / 100,
      dataSources: result.dataSources || [],
      algorithmVersion: result.algorithmVersion || 'v1.0.0',
      transportMode: transportMode,
    };

    setSavingTrip(true);
    setSaveTripError(null);
    try {
      const res = await saveTripToHistory(payload);
      if (res.success) {
        setSavedTrip(true);
      } else {
        setSaveTripError(res.error?.message || 'Gagal menyimpan riwayat perjalanan.');
      }
    } catch {
      setSaveTripError('Terjadi kendala saat menghubungi server untuk menyimpan riwayat.');
    } finally {
      setSavingTrip(false);
    }
  };

  // Handler pemilihan moda transportasi dengan auto-refetch jika rute telah dicari
  const handleTransportModeChange = (mode: 'car' | 'motorcycle' | 'walk') => {
    setTransportMode(mode);
    setSavedTrip(false);
    setSaveTripError(null);
    if ((appliedOrigin && appliedDestination) || (originInput.trim() && destInput.trim())) {
      handleSearchRoutes(mode);
    }
  };

  // Handler pergeseran slider prioritas optimasi (0, 25, 50, 75, 100)
  // Dilengkapi re-evaluasi ALG-03 secara real-time di sisi klien tanpa perlu fetch ulang
  const handleExposureWeightChange = (newVal: number) => {
    setExposureWeight(newVal);

    if (result && result.routes && result.routes.length > 0) {
      try {
        // Jika pengguna memilih prioritas udara bersih (75% / 100%), perlonggar batas toleransi waktu
        // agar rute yang lebih bersih tidak tereliminasi oleh selisih durasi beberapa menit
        const effectiveTolerance =
          newVal === 100 ? 50 : newVal === 75 ? 40 : extraTimeTolerance;

        const decision = decideRoutes({
          routes: result.routes,
          preferences: {
            exposureWeight: newVal / 100,
            maxExtraTimePercent: effectiveTolerance,
          },
        });

        setResult((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            routes: decision.routes,
            recommendedRouteLabel: decision.recommendedRouteLabel,
            explanation: decision.explanation,
            actionMessages: decision.actionMessages,
          };
        });

        if (decision.recommendedRouteLabel) {
          setSelectedRouteLabel(decision.recommendedRouteLabel);
        }
      } catch (err) {
        console.warn('Gagal mengevaluasi ulang preferensi rute di browser:', err);
      }
    }
  };

  // Handler Swap Lokasi Asal & Tujuan (Membalikkan rute dan titik singgah)
  const handleSwap = () => {
    setActiveDropdown(null);
    const tempInput = originInput;
    const tempCoord = originCoord;
    setOriginInput(destInput);
    setOriginCoord(destCoord);
    setDestInput(tempInput);
    setDestCoord(tempCoord);
    if (waypoints.length > 1) {
      setWaypoints((prev) => [...prev].reverse());
    }
  };

  // Pilih Kandidat Rute Terpilih
  const activeRoute = result?.routes.find((r) => r.label === selectedRouteLabel) || result?.routes[0];
  const recommendedRoute = result?.routes.find((r) => r.label === result?.recommendedRouteLabel) || result?.routes[0];
  const fastestRoute = result?.routes.find((r) => r.isFastest) || result?.routes[0];

  // Stasiun kualitas udara terdekat yang dilalui rute terpilih (dinamis berganti saat rute diubah)
  const activeRouteStations = React.useMemo<StationData[]>(() => {
    if (!result || !activeRoute) return [];

    const coords = (activeRoute.geometry?.coordinates as [number, number][]) || [];
    const stationsById = new Map<string, StationData>();
    stations.forEach((s) => {
      stationsById.set(s.stationId, s);
      stationsById.set(s.stationName, s);
    });

    const collected: StationData[] = [];
    const seenIds = new Set<string>();

    // 1. Ambil stasiun yang secara aktual digunakan oleh algoritma estimasi rute ini
    if (activeRoute.estimate?.stationsUsed && activeRoute.estimate.stationsUsed.length > 0) {
      for (const st of activeRoute.estimate.stationsUsed) {
        if (seenIds.has(st.stationId)) continue;
        const matched = stationsById.get(st.stationId) || stationsById.get(st.stationName);
        const lat = st.lat ?? matched?.lat;
        const lng = st.lng ?? matched?.lng;

        if (typeof lat === 'number' && typeof lng === 'number') {
          seenIds.add(st.stationId);
          collected.push({
            stationId: st.stationId,
            stationName: st.stationName,
            sourceName: matched?.sourceName || 'WAQI Official',
            lat,
            lng,
            pm25Concentration: st.pm25,
            pm25Origin: matched?.pm25Origin || 'measured',
            pm10Concentration: matched?.pm10Concentration ?? null,
            dominantPollutant: matched?.dominantPollutant ?? 'pm25',
            aqi: pm25ToAqi(st.pm25) ?? Math.round(st.pm25 * 2.2),
            observedAt: matched?.observedAt || new Date().toISOString(),
            ageMinutes: st.ageMinutes ?? matched?.ageMinutes ?? null,
            freshness: st.freshness ?? matched?.freshness ?? 'fresh',
            distanceMeters: st.distanceMeters,
            dataType: st.dataType,
          });
        }
      }
    }

    // 2. Jika stasiun belum ada atau rute belum mencakup stationsUsed, cari stasiun terdekat dari koridor rute
    if (collected.length === 0 && stations.length > 0) {
      const samplePoints: [number, number][] =
        coords.length > 0
          ? coords.filter((_, idx) => idx % Math.max(1, Math.floor(coords.length / 40)) === 0)
          : [
              appliedOrigin ? [appliedOrigin.lat, appliedOrigin.lng] : null,
              ...appliedWaypoints.map((w) => [w.lat, w.lng] as [number, number]),
              appliedDestination ? [appliedDestination.lat, appliedDestination.lng] : null,
            ].filter(Boolean) as [number, number][];

      const candidateStations = stations
        .map((st) => {
          let minDistance = Infinity;
          for (const [lat, lng] of samplePoints) {
            const d = haversineDistanceMeters(st.lat, st.lng, lat, lng);
            if (d < minDistance) minDistance = d;
          }
          return {
            ...st,
            distanceMeters: minDistance,
            aqi: st.aqi ?? (st.pm25Concentration ? pm25ToAqi(st.pm25Concentration) : 50),
          };
        })
        .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));

      // Ambil stasiun dalam radius koridor rute (<= 25 km) atau top 3 terdekat
      const nearby = candidateStations.filter((s) => (s.distanceMeters ?? Infinity) <= 25000);
      return (nearby.length > 0 ? nearby : candidateStations).slice(0, 3);
    }

    return collected.sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
  }, [result, activeRoute, stations, appliedOrigin, appliedDestination, appliedWaypoints]);

  return (
    <div className="relative w-full h-[calc(100vh-56px)] mt-[56px] overflow-hidden bg-slate-100">
      {/* 1. Real Interactive Leaflet Navigation Map */}
      <div className="w-full h-full absolute inset-0 z-0">
        <NavigationMap
          origin={appliedOrigin}
          destination={appliedDestination}
          waypoints={appliedWaypoints}
          routes={result?.routes || []}
          selectedRouteLabel={selectedRouteLabel}
          onSelectRoute={(label) => setSelectedRouteLabel(label)}
          stations={activeRouteStations}
        />
      </div>

      {/* 2. Google Maps Style Floating Directions Sidebar Panel */}
      <div className="absolute top-4 left-4 z-20 w-[420px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-5rem)] flex flex-col bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden">
        {/* Mode Selector Tabs (Google Maps Style) */}
        <div className="flex items-center justify-around border-b border-slate-200/80 bg-slate-50/70 py-2 px-3">
          <button
            onClick={() => handleTransportModeChange('car')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              transportMode === 'car'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Car className="w-3.5 h-3.5 shrink-0" />
            <span>Mobil</span>
          </button>
          <button
            onClick={() => handleTransportModeChange('motorcycle')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              transportMode === 'motorcycle'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bike className="w-3.5 h-3.5 shrink-0" />
            <span>Motor</span>
          </button>
          <button
            onClick={() => handleTransportModeChange('walk')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              transportMode === 'walk'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Footprints className="w-3.5 h-3.5 shrink-0" />
            <span>Pejalan</span>
          </button>
        </div>

        {/* Directions Search Box */}
        <div ref={searchContainerRef} className="p-4 border-b border-slate-200/80 relative">
          <div className="flex items-start gap-3">
            {/* Visual Indicators & Connector Column */}
            <div className="flex flex-col items-center pt-2 select-none">
              <span className="w-4 h-4 rounded-full border-2 border-emerald-500 bg-white flex items-center justify-center text-[9px] font-bold text-emerald-700 shadow-xs" title="Titik Keberangkatan">
                A
              </span>
              <span className="w-0.5 h-6 bg-slate-300 border-dashed my-1" />

              {waypoints.map((wp, index) => (
                <React.Fragment key={wp.id}>
                  <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold shadow-xs" title={`Titik Singgah ${index + 1}`}>
                    {index + 1}
                  </span>
                  <span className="w-0.5 h-6 bg-slate-300 border-dashed my-1" />
                </React.Fragment>
              ))}

              <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[9px] font-bold shadow-xs" title="Titik Tujuan">
                B
              </span>
            </div>

            {/* Input Fields Column */}
            <div className="flex-1 flex flex-col gap-2 relative">
              {/* Origin Input */}
              <div className="relative">
                <input
                  ref={originInputRef}
                  type="text"
                  value={originInput}
                  onChange={(e) => {
                    setOriginInput(e.target.value);
                    setActiveDropdown('origin');
                  }}
                  onFocus={() => setActiveDropdown('origin')}
                  onClick={() => setActiveDropdown('origin')}
                  placeholder="Pilih titik keberangkatan..."
                  className="w-full bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-slate-800 text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                />
                {searchingOrigin && (
                  <span className="absolute right-2.5 top-2.5 w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                )}

                {/* Autocomplete Dropdown Origin (Hanya tampil saat activeDropdown === 'origin') */}
                {activeDropdown === 'origin' && originSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 max-h-56 overflow-y-auto custom-scrollbar">
                    {originSuggestions.map((item, idx) => {
                      const parts = item.label.split(',');
                      const title = parts[0]?.trim() || item.label;
                      const subtitle = parts.slice(1, 4).map((p) => p.trim()).join(', ');

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectOrigin(item)}
                          className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-emerald-50 border-b border-slate-100 last:border-none flex items-start gap-2.5 text-slate-700 transition"
                        >
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <strong className="block text-slate-900 font-semibold truncate">{title}</strong>
                            {subtitle && (
                              <span className="block text-[11px] text-slate-500 truncate">{subtitle}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Waypoints Input Rows (Titik Singgah) */}
              {waypoints.map((wp, index) => (
                <div key={wp.id} className="relative flex items-center gap-1.5 animate-slide-down">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={wp.input}
                      onChange={(e) => handleWaypointInputChange(wp.id, e.target.value)}
                      onFocus={() => setActiveDropdown(`waypoint-${wp.id}`)}
                      onClick={() => setActiveDropdown(`waypoint-${wp.id}`)}
                      placeholder={`Pilih titik singgah ${index + 1}...`}
                      className="w-full bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-slate-800 text-xs font-medium px-3 py-2 rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                    />
                    {wp.searching && (
                      <span className="absolute right-2.5 top-2.5 w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    )}

                    {/* Autocomplete Dropdown Waypoint */}
                    {activeDropdown === `waypoint-${wp.id}` && wp.suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 max-h-56 overflow-y-auto custom-scrollbar">
                        {wp.suggestions.map((item, idx) => {
                          const parts = item.label.split(',');
                          const title = parts[0]?.trim() || item.label;
                          const subtitle = parts.slice(1, 4).map((p) => p.trim()).join(', ');

                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectWaypoint(wp.id, item)}
                              className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-blue-50 border-b border-slate-100 last:border-none flex items-start gap-2.5 text-slate-700 transition"
                            >
                              <MapPin className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <strong className="block text-slate-900 font-semibold truncate">{title}</strong>
                                {subtitle && (
                                  <span className="block text-[11px] text-slate-500 truncate">{subtitle}</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Remove Waypoint Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveWaypoint(wp.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Hapus titik singgah"
                    aria-label="Hapus titik singgah"
                  >
                    <CloseIcon size={14} />
                  </button>
                </div>
              ))}

              {/* Destination Input */}
              <div className="relative">
                <input
                  ref={destInputRef}
                  type="text"
                  value={destInput}
                  onChange={(e) => {
                    setDestInput(e.target.value);
                    setActiveDropdown('destination');
                  }}
                  onFocus={() => setActiveDropdown('destination')}
                  onClick={() => setActiveDropdown('destination')}
                  placeholder="Pilih tujuan..."
                  className="w-full bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-slate-800 text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                />
                {searchingDest && (
                  <span className="absolute right-2.5 top-2.5 w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                )}

                {/* Autocomplete Dropdown Destination (Hanya tampil saat activeDropdown === 'destination') */}
                {activeDropdown === 'destination' && destSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 max-h-56 overflow-y-auto custom-scrollbar">
                    {destSuggestions.map((item, idx) => {
                      const parts = item.label.split(',');
                      const title = parts[0]?.trim() || item.label;
                      const subtitle = parts.slice(1, 4).map((p) => p.trim()).join(', ');

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectDest(item)}
                          className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-emerald-50 border-b border-slate-100 last:border-none flex items-start gap-2.5 text-slate-700 transition"
                        >
                          <MapPin className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <strong className="block text-slate-900 font-semibold truncate">{title}</strong>
                            {subtitle && (
                              <span className="block text-[11px] text-slate-500 truncate">{subtitle}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tombol Tambah Titik Singgah (Google Maps Style) */}
              {waypoints.length < 5 && (
                <button
                  type="button"
                  onClick={handleAddWaypoint}
                  className="mt-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/80 px-2 py-1 rounded-md transition flex items-center gap-1.5 self-start"
                >
                  <PlusIcon size={12} />
                  <span>Tambah titik singgah</span>
                </button>
              )}
            </div>

            {/* Swap Button */}
            <button
              onClick={handleSwap}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition mt-1"
              title="Tukar Titik Awal & Tujuan"
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
                  skipDestSearchRef.current = true;
                  setDestInput(loc.label);
                  setDestCoord({ lat: loc.lat, lng: loc.lng });
                  setDestSuggestions([]);
                  setActiveDropdown(null);
                }}
                className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 text-slate-600 whitespace-nowrap transition"
              >
                {loc.label}
              </button>
            ))}
          </div>

          {/* Optimization Preferences Slider (5 Posisi Diskrit: 0, 25, 50, 75, 100) */}
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-600 font-medium">Prioritas Optimasi:</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80 text-[11px]">
                {exposureWeight === 0 && 'Tercepat (0% Polusi)'}
                {exposureWeight === 25 && 'Cenderung Cepat (25% Bersih)'}
                {exposureWeight === 50 && 'Seimbang (50% : 50%)'}
                {exposureWeight === 75 && 'Cenderung Bersih (75% Bersih)'}
                {exposureWeight === 100 && 'Minim Polusi (100% Bersih)'}
              </span>
            </div>

            <div className="relative py-1">
              <input
                type="range"
                min="0"
                max="100"
                step="25"
                value={exposureWeight}
                onChange={(e) => handleExposureWeightChange(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer transition-all"
              />

              {/* 5 Step Indicator Ticks & Clickable Labels */}
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium mt-1 px-0.5 select-none">
                <button
                  type="button"
                  onClick={() => handleExposureWeightChange(0)}
                  className={`hover:text-emerald-700 transition ${exposureWeight === 0 ? 'text-emerald-700 font-bold' : ''}`}
                >
                  0%
                </button>
                <button
                  type="button"
                  onClick={() => handleExposureWeightChange(25)}
                  className={`hover:text-emerald-700 transition ${exposureWeight === 25 ? 'text-emerald-700 font-bold' : ''}`}
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() => handleExposureWeightChange(50)}
                  className={`hover:text-emerald-700 transition ${exposureWeight === 50 ? 'text-emerald-700 font-bold' : ''}`}
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => handleExposureWeightChange(75)}
                  className={`hover:text-emerald-700 transition ${exposureWeight === 75 ? 'text-emerald-700 font-bold' : ''}`}
                >
                  75%
                </button>
                <button
                  type="button"
                  onClick={() => handleExposureWeightChange(100)}
                  className={`hover:text-emerald-700 transition ${exposureWeight === 100 ? 'text-emerald-700 font-bold' : ''}`}
                >
                  100%
                </button>
              </div>
            </div>

            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span className="inline-flex items-center gap-1">
                <Timer className="w-3 h-3 text-slate-400" />
                <span>Prioritas Waktu</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Leaf className="w-3 h-3 text-emerald-600" />
                <span>Prioritas Udara Bersih</span>
              </span>
            </div>
          </div>

          {/* Cari Rute Button */}
          <button
            onClick={() => handleSearchRoutes()}
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
                const isActuallyCleaner =
                  route.comparison.exposureDeltaPercent !== null &&
                  route.comparison.exposureDeltaPercent < 0;
                const isActuallyHigherExposure =
                  route.comparison.exposureDeltaPercent !== null &&
                  route.comparison.exposureDeltaPercent > 0;
                const durationFormatted = formatDuration(route.durationSeconds);
                const km = formatDistance(route.distanceMeters);
                const exposureSaved =
                  route.comparison.exposureDeltaPercent != null
                    ? Math.abs(Math.round(route.comparison.exposureDeltaPercent))
                    : null;
                const stationsCount = route.estimate?.stationsUsed?.length || 0;

                // Tentukan subtitle rute yang presisi dan transparan
                let routeSubtitle = '— Tercepat';
                if (route.isFastest) {
                  const otherRoutes = result.routes.filter((r) => r.id !== route.id);
                  const isAlsoCleanest = otherRoutes.every(
                    (r) =>
                      r.estimate.exposureIndexPm25 === null ||
                      (route.estimate.exposureIndexPm25 !== null &&
                        route.estimate.exposureIndexPm25 <= r.estimate.exposureIndexPm25)
                  );
                  routeSubtitle = isAlsoCleanest ? '— Tercepat & Paling Bersih' : '— Tercepat';
                } else if (isActuallyCleaner) {
                  routeSubtitle = '— Alternatif Bersih';
                } else {
                  routeSubtitle = '— Alternatif Jalur';
                }

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
                            route.isFastest
                              ? 'bg-blue-600'
                              : isActuallyCleaner
                              ? 'bg-emerald-500'
                              : 'bg-slate-400'
                          }`}
                        />
                        <strong className="text-sm font-bold text-slate-800">
                          Rute {route.label} {routeSubtitle}
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
                        <span className="inline-flex items-center gap-1 text-slate-500 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded whitespace-nowrap ml-auto">
                          <Radio className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{stationsCount} stasiun dilalui</span>
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
                        {isActuallyCleaner && exposureSaved != null && exposureSaved > 0 && (
                          <span className="text-emerald-700 font-bold text-[11px] bg-emerald-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                            ↓ {exposureSaved}% Lebih Bersih
                          </span>
                        )}
                        {isActuallyHigherExposure && exposureSaved != null && exposureSaved > 0 && (
                          <span className="text-amber-700 font-medium text-[11px] bg-amber-50 px-1.5 py-0.5 rounded whitespace-nowrap">
                            ↑ {exposureSaved}% Lebih Tinggi
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

      {/* 3. Google Maps Style Right Floating Route Details Panel */}
      {showDetailsDrawer && activeRoute && (
        <div className="absolute z-20 transition-all duration-300 animate-slide-down
          bottom-4 left-4 right-4 max-h-[55vh]
          md:bottom-auto md:left-auto md:top-4 md:right-4 md:w-[420px] md:max-h-[calc(100vh-5rem)]
          bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="min-w-0 flex-1">
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
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition flex-shrink-0"
              aria-label="Tutup Detail"
              title="Tutup Panel Detail"
            >
              <CloseIcon size={18} />
            </button>
          </div>

          {/* Stasiun Kualitas Udara Terdekat yang Dilalui */}
          {activeRouteStations.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Radio className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span>Stasiun Terdekat yang Dilalui (Rute {activeRoute.label})</span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {activeRouteStations.length} stasiun
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                {activeRouteStations.map((st, idx) => {
                  const pmVal = st.pm25Concentration ?? 25;
                  const aqi = st.aqi ?? pm25ToAqi(pmVal) ?? Math.round(pmVal * 2.2);
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
                          <span>{formatDistance(st.distanceMeters ?? 0)} dari rute</span>
                          <span>•</span>
                          <span>PM2.5: {pmVal.toFixed(1)} µg/m³</span>
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
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Panduan Mitigasi Kesehatan</span>
            </span>
            <div className="grid grid-cols-1 gap-2 text-xs">
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
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <strong className="block text-slate-800 font-semibold">{msg.message}</strong>
                    <span className="text-[11px] text-slate-500">{msg.basis}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons: Export to Google Maps & Save Trip */}
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <button
              onClick={() => {
                if (appliedOrigin && appliedDestination) {
                  let url = `https://www.google.com/maps/dir/?api=1&origin=${appliedOrigin.lat},${appliedOrigin.lng}&destination=${appliedDestination.lat},${appliedDestination.lng}&travelmode=driving`;
                  if (appliedWaypoints && appliedWaypoints.length > 0) {
                    const wpParam = appliedWaypoints.map((w) => `${w.lat},${w.lng}`).join('|');
                    url += `&waypoints=${encodeURIComponent(wpParam)}`;
                  }
                  window.open(url, '_blank');
                }
              }}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-sm"
            >
              <NavigationIcon size={14} />
              <span>Buka Petunjuk di Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleSaveTrip}
              disabled={savedTrip || savingTrip}
              className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition ${
                savedTrip
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60'
              }`}
            >
              {savingTrip ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : savedTrip ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tersimpan di Riwayat</span>
                </>
              ) : (
                <>
                  <HistoryIcon size={14} />
                  <span>Simpan Perjalanan</span>
                </>
              )}
            </button>
            {saveTripError && (
              <span className="text-[11px] text-rose-500 text-center font-medium block">
                {saveTripError}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RoutePlannerPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-screen bg-slate-100 flex items-center justify-center text-xs text-slate-500">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="font-semibold text-slate-600">Memuat Navigasi Rute...</span>
          </div>
        </div>
      }
    >
      <RoutePlannerContent />
    </Suspense>
  );
}
