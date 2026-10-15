'use client';

import React, { useEffect, useRef } from 'react';
import type { LatLngTuple, RouteLabel } from '@/types/common';
import type { AnalyzedRoute } from '@/types/algorithms';
import type { StationData } from '@/types/air-quality';
import { AQI_CATEGORIES } from '@/types/aqiScale';

interface NavigationMapProps {
  origin?: { lat: number; lng: number; label?: string } | null;
  destination?: { lat: number; lng: number; label?: string } | null;
  routes?: AnalyzedRoute[];
  selectedRouteLabel?: RouteLabel | null;
  onSelectRoute?: (label: RouteLabel) => void;
  stations?: StationData[];
  activeStationId?: string | null;
  onSelectStation?: (station: StationData) => void;
  center?: [number, number];
  zoom?: number;
}

export default function NavigationMap({
  origin,
  destination,
  routes = [],
  selectedRouteLabel,
  onSelectRoute,
  stations = [],
  activeStationId,
  onSelectStation,
  center = [-6.9932, 110.4203], // Default Semarang Center
  zoom = 13,
}: NavigationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layersRef = useRef<{ [key: string]: any }>({});

  // 1. Inisialisasi Peta Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    let isMounted = true;

    async function initLeaflet() {
      const L = await import('leaflet');
      if (!isMounted || !mapContainerRef.current) return;

      // Inisialisasi map dengan tile Google Maps / OpenStreetMap bergaya modern
      const map = L.map(mapContainerRef.current, {
        center,
        zoom,
        zoomControl: false, // Kita pasang zoom control custom di pojok kanan bawah
        attributionControl: true,
      });

      // Gunakan CartoDB Voyager / OSM yang memiliki tampilan bersih mirip Google Maps
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      // Grup layer untuk elemen interaktif
      layersRef.current.routeLayerGroup = L.layerGroup().addTo(map);
      layersRef.current.markerLayerGroup = L.layerGroup().addTo(map);
      layersRef.current.stationLayerGroup = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }

    initLeaflet();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Render Rute Polylines
  useEffect(() => {
    const map = mapInstanceRef.current;
    const routeGroup = layersRef.current?.routeLayerGroup;
    if (!map || !routeGroup) return;

    routeGroup.clearLayers();

    if (!routes || routes.length === 0) return;

    import('leaflet').then((L) => {
      const allBounds: [number, number][] = [];

      // Sort agar rute yang dipilih digambar paling atas
      const sortedRoutes = [...routes].sort((a, b) => {
        if (a.label === selectedRouteLabel) return 1;
        if (b.label === selectedRouteLabel) return -1;
        return 0;
      });

      sortedRoutes.forEach((route) => {
        const coords = route.geometry.coordinates as [number, number][];
        if (!coords || coords.length === 0) return;

        coords.forEach((c) => allBounds.push(c));

        const isSelected = route.label === selectedRouteLabel;
        const isCleanRoute = !route.isFastest;

        // Skema warna Google Maps:
        // Rute terpilih bersih: Emerald Green (#10b981) dengan border gelap
        // Rute terpilih tercepat: Google Blue (#2563eb)
        // Rute alternatif non-aktif: Abu-abu halus (#64748b)
        const activeColor = isCleanRoute ? '#10b981' : '#2563eb';
        const strokeColor = isSelected ? activeColor : '#94a3b8';
        const casingColor = isSelected ? (isCleanRoute ? '#064e3b' : '#1e3a8a') : '#475569';

        // 1. Garis Casing / Outline (efek kedalaman rute seperti Google Maps)
        const casing = L.polyline(coords, {
          color: casingColor,
          weight: isSelected ? 8 : 5,
          opacity: isSelected ? 0.9 : 0.4,
          lineCap: 'round',
          lineJoin: 'round',
        });

        // 2. Garis Inti Rute
        const polyline = L.polyline(coords, {
          color: strokeColor,
          weight: isSelected ? 5 : 3.5,
          opacity: isSelected ? 1.0 : 0.65,
          lineCap: 'round',
          lineJoin: 'round',
        });

        // Interaksi klik pada garis rute
        const clickHandler = () => {
          if (onSelectRoute) {
            onSelectRoute(route.label);
          }
        };

        casing.on('click', clickHandler);
        polyline.on('click', clickHandler);

        routeGroup.addLayer(casing);
        routeGroup.addLayer(polyline);
      });

      // Zoom auto-fit ke seluruh rute dengan padding agar pas dengan sidebar kiri
      if (allBounds.length > 0) {
        map.fitBounds(L.latLngBounds(allBounds), {
          paddingTopLeft: [420, 40], // Beri ruang untuk panel directions di kiri atas
          paddingBottomRight: [40, 40],
          maxZoom: 15,
        });
      }
    });
  }, [routes, selectedRouteLabel, onSelectRoute]);

  // 3. Render Marker Titik Asal & Destinasi
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markerGroup = layersRef.current?.markerLayerGroup;
    if (!map || !markerGroup) return;

    markerGroup.clearLayers();

    import('leaflet').then((L) => {
      // Marker Asal (A - Hijau)
      if (origin && typeof origin.lat === 'number' && typeof origin.lng === 'number') {
        const originIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `
            <div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:#10b981;color:#ffffff;font-weight:bold;font-size:13px;border:3px solid #ffffff;box-shadow:0 4px 12px rgba(16,185,129,0.5);cursor:pointer;">
              A
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const originMarker = L.marker([origin.lat, origin.lng], { icon: originIcon });
        originMarker.bindPopup(`<strong>Titik Keberangkatan</strong><br/>${origin.label || 'Titik Awal'}`);
        markerGroup.addLayer(originMarker);
      }

      // Marker Tujuan (B - Merah Google Maps)
      if (destination && typeof destination.lat === 'number' && typeof destination.lng === 'number') {
        const destIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `
            <div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:#ef4444;color:#ffffff;font-weight:bold;font-size:13px;border:3px solid #ffffff;box-shadow:0 4px 12px rgba(239,68,68,0.5);cursor:pointer;">
              B
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const destMarker = L.marker([destination.lat, destination.lng], { icon: destIcon });
        destMarker.bindPopup(`<strong>Titik Tujuan</strong><br/>${destination.label || 'Destinasi'}`);
        markerGroup.addLayer(destMarker);
      }
    });
  }, [origin, destination]);

  // 4. Render Stasiun Kualitas Udara (AQI Radar Pins)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const stationGroup = layersRef.current?.stationLayerGroup;
    if (!map || !stationGroup) return;

    stationGroup.clearLayers();

    if (!stations || stations.length === 0) return;

    import('leaflet').then((L) => {
      stations.forEach((st) => {
        const pm25Val = st.pm25Concentration ?? 25;
        const aqi = st.aqi ?? Math.round(pm25Val * 2.2);
        
        let aqiColor = '#10b981';
        let label = 'Baik';
        for (const cat of AQI_CATEGORIES) {
          if (
            (cat.code === 'good' && aqi <= 50) ||
            (cat.code === 'moderate' && aqi > 50 && aqi <= 100) ||
            (cat.code === 'unhealthySensitive' && aqi > 100 && aqi <= 150) ||
            (cat.code === 'unhealthy' && aqi > 150 && aqi <= 200) ||
            (cat.code === 'veryUnhealthy' && aqi > 200 && aqi <= 300) ||
            (cat.code === 'hazardous' && aqi > 300)
          ) {
            aqiColor = cat.color;
            label = cat.labelId;
            break;
          }
        }

        const isStationActive = st.stationId === activeStationId;

        const icon = L.divIcon({
          className: 'station-div-icon',
          html: `
            <div style="display:flex;align-items:center;gap:4px;padding:3px 8px;border-radius:9999px;background:${aqiColor};color:#ffffff;font-size:11px;font-weight:700;border:2px solid ${isStationActive ? '#ffffff' : 'rgba(255,255,255,0.7)'};box-shadow:0 3px 10px rgba(0,0,0,0.3);transform:${isStationActive ? 'scale(1.15)' : 'scale(1)'};transition:transform 0.2s;cursor:pointer;">
              <span style="width:6px;height:6px;border-radius:50%;background:#ffffff;"></span>
              <span>AQI ${aqi}</span>
            </div>
          `,
          iconSize: [68, 26],
          iconAnchor: [34, 13],
        });

        const marker = L.marker([st.lat, st.lng], { icon });

        marker.on('click', () => {
          if (onSelectStation) {
            onSelectStation(st);
          }
        });

        marker.bindPopup(`
          <div style="font-family:sans-serif;font-size:12px;color:#1e293b;min-width:160px;">
            <strong style="font-size:13px;display:block;margin-bottom:4px;">${st.stationName}</strong>
            <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
              <span>Status:</span>
              <span style="font-weight:bold;color:${aqiColor}">${label}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
              <span>PM2.5:</span>
              <strong>${(st.pm25Concentration ?? 0).toFixed(1)} µg/m³</strong>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span>Sumber:</span>
              <span>${st.sourceName || 'WAQI Official'}</span>
            </div>
          </div>
        `);

        stationGroup.addLayer(marker);
      });
    });
  }, [stations, activeStationId, onSelectStation]);

  // Tombol Kontrol Peta
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetCenter = () => mapInstanceRef.current?.setView(center, zoom);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-100">
      {/* Container Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Map Controls (Pojok Kanan Bawah - Google Maps Style) */}
      <div className="absolute right-4 bottom-6 z-10 flex flex-col items-center gap-2">
        <div className="bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden flex flex-col">
          <button
            onClick={handleZoomIn}
            className="w-10 h-10 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:bg-slate-200 border-b border-slate-200 transition font-bold text-lg"
            title="Perbesar Peta"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            className="w-10 h-10 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition font-bold text-lg"
            title="Perkecil Peta"
            aria-label="Zoom out"
          >
            −
          </button>
        </div>

        <button
          onClick={handleResetCenter}
          className="w-10 h-10 bg-white rounded-lg shadow-lg border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition"
          title="Pusatkan ke Semarang"
          aria-label="Pusatkan Peta"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
