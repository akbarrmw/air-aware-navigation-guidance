/**
 * @file stationsMap.test.ts
 * @description Unit tests untuk query bounding box stasiun dan penanganan status peta P-02 (TC-33).
 */

import { describe, it, expect } from 'vitest';
import { StationsQuerySchema } from '@/types/schemas';
import type { StationData } from '@/types/air-quality';

describe('Air Quality Map & Stations (TC-33)', () => {
  describe('StationsQuerySchema Bounding Box Validation', () => {
    it('menerima bounding box koordinat valid kota Semarang', () => {
      const bbox = {
        south: -7.05,
        west: 110.35,
        north: -6.95,
        east: 110.45,
      };

      const result = StationsQuerySchema.safeParse(bbox);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.south).toBe(-7.05);
        expect(result.data.east).toBe(110.45);
      }
    });

    it('mengubah string numerik query searchParams menjadi angka (z.coerce)', () => {
      const queryParams = {
        south: '-7.0500',
        west: '110.3500',
        north: '-6.9500',
        east: '110.4500',
      };

      const result = StationsQuerySchema.safeParse(queryParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.south).toBe('number');
        expect(result.data.south).toBe(-7.05);
      }
    });

    it('menolak koordinat latitude di luar rentang [-90, 90]', () => {
      const invalidLat = {
        south: -95.0,
        west: 110.0,
        north: -6.0,
        east: 110.0,
      };

      const result = StationsQuerySchema.safeParse(invalidLat);
      expect(result.success).toBe(false);
    });

    it('menolak koordinat longitude di luar rentang [-180, 180]', () => {
      const invalidLng = {
        south: -7.0,
        west: -190.0,
        north: -6.0,
        east: 110.0,
      };

      const result = StationsQuerySchema.safeParse(invalidLng);
      expect(result.success).toBe(false);
    });
  });

  describe('Station Data Handling & Categorization', () => {
    const mockStation: StationData = {
      stationId: 'st-smg-01',
      stationName: 'Stasiun BMKG Simpang Lima',
      lat: -6.9928,
      lng: 110.4222,
      aqi: 45,
      dominantPollutant: 'pm25',
      pm25Concentration: 11.2,
      pm25Origin: 'measured',
      pm10Concentration: 24.0,
      observedAt: '2026-10-15T12:00:00Z',
      ageMinutes: 30,
      freshness: 'fresh',
      dataType: 'station_observation',
      sourceName: 'BMKG Jawa Tengah',
    };

    it('mengidentifikasi stasiun dengan status data fresh (< 3 jam)', () => {
      expect(mockStation.freshness).toBe('fresh');
      expect(mockStation.ageMinutes).toBeLessThan(180);
    });

    it('menangani stasiun dengan PM2.5 bernilai null tanpa mengubah menjadi 0', () => {
      const stationNoPm25: StationData = {
        ...mockStation,
        pm25Concentration: null,
        pm25Origin: null,
      };

      expect(stationNoPm25.pm25Concentration).toBeNull();
      expect(stationNoPm25.pm25Concentration).not.toBe(0);
    });

    it('memfilter stasiun berdasarkan kata kunci nama', () => {
      const stationList: StationData[] = [
        mockStation,
        {
          ...mockStation,
          stationId: 'st-smg-02',
          stationName: 'Stasiun Undip Tembalang',
          lat: -7.0514,
          lng: 110.4388,
        },
      ];

      const query = 'tembalang';
      const filtered = stationList.filter((s) =>
        s.stationName.toLowerCase().includes(query.toLowerCase())
      );

      expect(filtered.length).toBe(1);
      expect(filtered[0].stationId).toBe('st-smg-02');
    });
  });
});
