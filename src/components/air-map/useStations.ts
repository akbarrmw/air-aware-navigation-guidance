/**
 * @file useStations.ts
 * @description Hook React untuk memuat data stasiun pemantau kualitas udara berdasarkan bounding box viewport peta.
 * Mendukung pembaruan otomatis saat peta digeser/di-zoom (moveend / idle).
 * 
 * @author Person 3 (Database, Auth, & History Services)
 * @module components/air-map/useStations
 * @see CODE_SPEC_AANG.md Bagian 8.1 & FR-02
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { StationData } from '@/types/air-quality';
import type { BoundingBox } from '@/types/common';
import type { ApiResponse } from '@/types/api';

export interface UseStationsResult {
  stations: StationData[];
  loading: boolean;
  error: string | null;
  selectedStation: StationData | null;
  setSelectedStation: (station: StationData | null) => void;
  fetchStations: (bounds?: BoundingBox) => Promise<void>;
  dataMode: string;
}

export function useStations(initialBounds?: BoundingBox): UseStationsResult {
  const [stations, setStations] = useState<StationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<StationData | null>(null);
  const [dataMode, setDataMode] = useState<string>('live');

  // Debounce ref untuk mencegah spam request saat pergerakan peta
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStations = useCallback(async (bounds?: BoundingBox) => {
    setLoading(true);
    setError(null);

    try {
      let url = '/api/air-quality/stations';
      if (bounds) {
        const params = new URLSearchParams({
          south: bounds.south.toFixed(4),
          west: bounds.west.toFixed(4),
          north: bounds.north.toFixed(4),
          east: bounds.east.toFixed(4),
        });
        url += `?${params.toString()}`;
      }

      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      const json: ApiResponse<StationData[]> = await res.json();

      if (json.success && json.data) {
        setStations(json.data);
        if (json.meta?.dataMode) {
          setDataMode(json.meta.dataMode);
        }

        // Jika stasiun yang dipilih sebelumnya tidak ada di daftar baru, pilih stasiun pertama
        setSelectedStation((prev) => {
          if (!prev) return json.data?.[0] || null;
          const match = json.data?.find((s) => s.stationId === prev.stationId);
          return match || json.data?.[0] || null;
        });
      } else {
        setError(json.error?.message || 'Gagal memuat stasiun pemantau.');
      }
    } catch (err) {
      console.error('[useStations] Error fetching stations:', err);
      setError('Terjadi kendala jaringan saat memuat stasiun kualitas udara.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Pemuatan data stasiun awal
  useEffect(() => {
    let ignore = false;

    async function loadInitial() {
      try {
        let url = '/api/air-quality/stations';
        if (initialBounds) {
          const params = new URLSearchParams({
            south: initialBounds.south.toFixed(4),
            west: initialBounds.west.toFixed(4),
            north: initialBounds.north.toFixed(4),
            east: initialBounds.east.toFixed(4),
          });
          url += `?${params.toString()}`;
        }

        const res = await fetch(url, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });

        const json: ApiResponse<StationData[]> = await res.json();

        if (!ignore) {
          if (json.success && json.data) {
            setStations(json.data);
            if (json.meta?.dataMode) {
              setDataMode(json.meta.dataMode);
            }
            setSelectedStation(json.data[0] || null);
          } else {
            setError(json.error?.message || 'Gagal memuat stasiun pemantau.');
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error('[useStations] Error fetching stations:', err);
          setError('Terjadi kendala jaringan saat memuat stasiun kualitas udara.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadInitial();

    return () => {
      ignore = true;
    };
  }, [initialBounds]);

  const debouncedFetchStations = useCallback(
    async (bounds?: BoundingBox) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        fetchStations(bounds);
      }, 400);
    },
    [fetchStations]
  );

  return {
    stations,
    loading,
    error,
    selectedStation,
    setSelectedStation,
    fetchStations: debouncedFetchStations,
    dataMode,
  };
}
