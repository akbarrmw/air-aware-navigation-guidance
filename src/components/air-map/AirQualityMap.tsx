/**
 * Peta interaktif untuk visualisasi sebaran stasiun kualitas udara.
 */

'use client';

import React, { useEffect, useRef } from 'react';
import type { StationData } from '@/types/air-quality';
import type { BoundingBox } from '@/types/common';
import type L from 'leaflet';

interface AirQualityMapProps {
  stations: StationData[];
  selectedStation: StationData | null;
  onSelectStation: (station: StationData) => void;
  onBoundsChange?: (bounds: BoundingBox) => void;
}

function getMarkerColor(aqi: number | null): string {
  if (aqi === null) return '#64748B'; // slate-500
  if (aqi <= 50) return '#10B981';   // emerald-500
  if (aqi <= 100) return '#F59E0B';  // amber-500
  if (aqi <= 150) return '#F97316';  // orange-500
  if (aqi <= 200) return '#EF4444';  // rose-500
  if (aqi <= 300) return '#8B5CF6';  // purple-500
  return '#991B1B';                  // red-800
}

export function AirQualityMap({
  stations,
  selectedStation,
  onSelectStation,
  onBoundsChange,
}: AirQualityMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Inisialisasi peta Leaflet sisi klien
  useEffect(() => {
    let isMounted = true;

    async function initLeaflet() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      // Impor Leaflet secara dinamis untuk SSR safety
      const LModule = (await import('leaflet')).default;

      // Pastikan CSS Leaflet telah dimuat
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!isMounted || !mapContainerRef.current) return;

      // Koordinat default: Simpang Lima Semarang (Kota Pilot)
      const semarangCenter: [number, number] = [-6.9928, 110.4222];
      const map = LModule.map(mapContainerRef.current, {
        center: semarangCenter,
        zoom: 12,
        zoomControl: true,
      });

      // Gunakan CartoDB Dark Matter tile layer untuk tema gelap modern AANG
      LModule.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19,
        }
      ).addTo(map);

      // Layer grup untuk marker stasiun
      const markersLayer = LModule.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;

      // Event listener pergerakan peta (moveend / TC-33)
      map.on('moveend', () => {
        if (!onBoundsChange) return;
        const bounds = map.getBounds();
        onBoundsChange({
          south: bounds.getSouth(),
          west: bounds.getWest(),
          north: bounds.getNorth(),
          east: bounds.getEast(),
        });
      });
    }

    initLeaflet();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [onBoundsChange]);

  // Update marker ketika daftar stasiun atau stasiun terpilih berubah
  useEffect(() => {
    async function updateMarkers() {
      if (!mapInstanceRef.current || !markersLayerRef.current) return;

      const LModule = (await import('leaflet')).default;
      const markersLayer = markersLayerRef.current;
      markersLayer.clearLayers();

      stations.forEach((station) => {
        const isSelected = selectedStation?.stationId === station.stationId;
        const color = getMarkerColor(station.aqi);
        const aqiText = station.aqi !== null ? String(station.aqi) : '—';

        // Custom HTML pin icon
        const iconHtml = `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: ${isSelected ? '36px' : '30px'};
            height: ${isSelected ? '36px' : '30px'};
            border-radius: 50%;
            background-color: ${color};
            color: #020617;
            font-size: ${isSelected ? '12px' : '10px'};
            font-weight: 900;
            border: ${isSelected ? '3px solid #ffffff' : '2px solid rgba(255,255,255,0.7)'};
            box-shadow: 0 4px 14px ${color}80;
            cursor: pointer;
            transition: all 0.2s ease;
          ">
            ${aqiText}
            ${
              isSelected
                ? `<div style="
                    position: absolute;
                    inset: -6px;
                    border-radius: 50%;
                    border: 2px solid ${color};
                    animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
                  "></div>`
                : ''
            }
          </div>
        `;

        const customIcon = LModule.divIcon({
          html: iconHtml,
          className: 'air-station-marker',
          iconSize: [isSelected ? 36 : 30, isSelected ? 36 : 30],
          iconAnchor: [isSelected ? 18 : 15, isSelected ? 18 : 15],
        });

        const marker = LModule.marker([station.lat, station.lng], {
          icon: customIcon,
          title: station.stationName,
        });

        marker.on('click', () => {
          onSelectStation(station);
        });

        // Tooltip hover
        marker.bindTooltip(
          `<strong>${station.stationName}</strong><br/>AQI: ${aqiText} | PM2.5: ${
            station.pm25Concentration !== null ? station.pm25Concentration + ' µg/m³' : 'N/A'
          }`,
          { direction: 'top', offset: [0, -10] }
        );

        markersLayer.addLayer(marker);
      });
    }

    updateMarkers();
  }, [stations, selectedStation, onSelectStation]);

  // Center map on selected station if clicked from side panel
  useEffect(() => {
    if (mapInstanceRef.current && selectedStation) {
      mapInstanceRef.current.panTo([selectedStation.lat, selectedStation.lng], {
        animate: true,
        duration: 0.8,
      });
    }
  }, [selectedStation]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Floating Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-20 bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md max-w-xs text-xs space-y-2">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
          Legenda Skala AQI
        </span>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-slate-300">Baik (0–50)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-yellow-500 shrink-0" />
            <span className="text-slate-300">Sedang (51–100)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0" />
            <span className="text-slate-300">Sensitif (101–150)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
            <span className="text-slate-300">Tdk Sehat (151–200)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-500 shrink-0" />
            <span className="text-slate-300">Sangat Buruk (201+)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-500 shrink-0" />
            <span className="text-slate-400">Tanpa Data</span>
          </div>
        </div>
      </div>
    </div>
  );
}
