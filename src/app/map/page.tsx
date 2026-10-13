'use client';

import React, { useEffect, useState } from 'react';
import { StationData } from '@/types/air-quality';
import { ApiResponse } from '@/types/api';

export default function MapPage() {
  const [stations, setStations] = useState<StationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState<StationData | null>(null);

  useEffect(() => {
    async function loadStations() {
      try {
        const res = await fetch('/api/air-quality/stations');
        const json: ApiResponse<StationData[]> = await res.json();
        if (json.success && json.data) {
          setStations(json.data);
          setSelectedStation(json.data[0] || null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadStations();
  }, []);

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] bg-slate-950 text-white">
      {/* Side Panel */}
      <div className="w-full md:w-96 bg-slate-900 border-r border-slate-800 p-6 overflow-y-auto">
        <h1 className="text-xl font-bold text-emerald-400 mb-1">Stasiun Kualitas Udara</h1>
        <p className="text-xs text-slate-400 mb-6">Kota Pilot: Semarang dan sekitarnya</p>

        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm animate-pulse">
            Memuat data stasiun pemantau...
          </div>
        ) : (
          <div className="space-y-3">
            {stations.map((st) => (
              <div
                key={st.stationId}
                onClick={() => setSelectedStation(st)}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  selectedStation?.stationId === st.stationId
                    ? 'bg-slate-800 border-emerald-500 shadow-md'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">{st.stationName}</h3>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold ${
                      st.aqi && st.aqi <= 50
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-600'
                        : st.aqi && st.aqi <= 100
                        ? 'bg-amber-950 text-amber-400 border border-amber-600'
                        : 'bg-orange-950 text-orange-400 border border-orange-600'
                    }`}
                  >
                    AQI {st.aqi ?? '-'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <div>PM2.5: <span className="text-slate-200 font-medium">{st.pm25Concentration} µg/m³</span></div>
                  <div>Status: <span className="text-emerald-400 font-medium">{st.freshness}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedStation && (
          <div className="mt-6 pt-6 border-t border-slate-800">
            <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">
              Detail Stasiun Terpilih
            </h4>
            <div className="space-y-1 text-xs text-slate-300">
              <p><strong className="text-white">Sumber:</strong> {selectedStation.sourceName}</p>
              <p><strong className="text-white">Waktu Observasi:</strong> {new Date(selectedStation.observedAt).toLocaleTimeString()}</p>
              <p><strong className="text-white">Usia Data:</strong> {selectedStation.ageMinutes} menit yang lalu</p>
              <p><strong className="text-white">Koordinat:</strong> {selectedStation.lat}, {selectedStation.lng}</p>
            </div>
          </div>
        )}
      </div>

      {/* Map View Placeholder / Interactive Leaflet Container */}
      <div className="flex-1 relative bg-slate-950 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl mx-auto mb-4">
            🗺️
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Peta Kualitas Udara (Leaflet Container)</h3>
          <p className="text-slate-400 text-sm mb-4 leading-relaxed">
            Menampilkan {stations.length} stasiun kualitas udara aktif di kota Semarang. Person 4 dapat mengintegrasikan wrapper Leaflet di <code className="text-emerald-300">src/components/map/MapContainer.tsx</code>.
          </p>
          <div className="inline-flex gap-2">
            <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300">
              ● Hijau: Baik (0-50)
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300">
              ● Kuning: Sedang (51-100)
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300">
              ● Jingga: Sensitif (101-150)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
