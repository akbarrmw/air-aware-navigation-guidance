/**
 * @file tripMapper.test.ts
 * @description Unit tests untuk polyline encode/decode dan pemetaan data riwayat perjalanan (FR-11).
 */

import { describe, it, expect } from 'vitest';
import { encodePolyline, decodePolyline } from '@/lib/trips/polyline';
import { mapPayloadToRow, mapRowToListItem, mapRowToDetail } from '@/lib/trips/tripMapper';
import type { TripSavePayload } from '@/types/trips';
import type { TripRow } from '@/types/database';
import type { LatLngTuple } from '@/types/common';

describe('Polyline Encoding & Decoding', () => {
  it('berhasil melakukan round-trip encode dan decode koordinat lintasan', () => {
    const coordinates: LatLngTuple[] = [
      [-6.9902, 110.4228], // Simpang Lima Semarang
      [-6.9934, 110.4215],
      [-7.0051, 110.4381], // Kawasan UNDIP Pleburan
    ];

    const encoded = encodePolyline(coordinates);
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = decodePolyline(encoded);
    expect(decoded.length).toBe(coordinates.length);

    // Verifikasi toleransi presisi desimal (~1 meter / 1e-5)
    for (let i = 0; i < coordinates.length; i++) {
      expect(decoded[i][0]).toBeCloseTo(coordinates[i][0], 4);
      expect(decoded[i][1]).toBeCloseTo(coordinates[i][1], 4);
    }
  });

  it('menangani input array kosong dengan aman', () => {
    expect(encodePolyline([])).toBe('');
    expect(decodePolyline('')).toEqual([]);
    expect(decodePolyline('   ')).toEqual([]);
  });
});

describe('Trip Mapper (FR-11)', () => {
  const mockPayload: TripSavePayload = {
    origin: {
      label: 'Simpang Lima',
      lat: -6.9902,
      lng: 110.4228,
    },
    destination: {
      label: 'Stasiun Tawang',
      lat: -6.9642,
      lng: 110.4278,
    },
    selectedRoute: {
      id: 'route-test-1',
      label: 'A',
      distanceMeters: 4500,
      durationSeconds: 900,
      geometry: {
        coordinates: [
          [-6.9902, 110.4228],
          [-6.9642, 110.4278],
        ],
      },
      isFastest: true,
      estimate: {
        exposureIndexPm25: 18.5,
        avgPm25: 16.2,
        category: 'good',
        coverageRatio: 0.95,
        confidenceLevel: 'high',
        maxDataAgeMinutes: 15,
        isPartiallyImputed: false,
        segments: [],
        topContributors: [],
        stationsUsed: [],
      },
      comparison: {
        extraSeconds: 0,
        extraPercent: 0,
        exposureDeltaPercent: 0,
      },
      withinTimeLimit: true,
      isDominated: false,
      score: 1.0,
    },
    fastest: {
      durationSeconds: 900,
      exposureIndexPm25: 18.5,
    },
    wasRecommended: true,
    usedExposureWeight: 0.5,
    dataSources: [
      {
        sourceName: 'BMKG Semarang',
        dataType: 'station_observation',
        attributionText: 'Stasiun BMKG',
      },
    ],
    algorithmVersion: 'v1.0.0',
    transportMode: 'motorcycle',
  };

  it('mapPayloadToRow memetakan data dengan snake_case, transport_mode, dan menyimpan JSONB details', () => {
    const row = mapPayloadToRow('user-uuid-123', mockPayload);

    expect(row.user_id).toBe('user-uuid-123');
    expect(row.origin_label).toBe('Simpang Lima');
    expect(row.destination_label).toBe('Stasiun Tawang');
    expect(row.transport_mode).toBe('motorcycle');
    expect(row.distance_m).toBe(4500);
    expect(row.duration_s).toBe(900);
    expect(row.confidence_level).toBe('high');
    expect(row.was_recommended).toBe(true);
    expect(typeof row.route_polyline).toBe('string');
    expect(row.data_source).toContain('BMKG Semarang');
    expect(row.estimate_details).toBeDefined();

    // Uji fallback default 'car' saat transportMode tidak diisi
    const { transportMode: _, ...payloadWithoutMode } = mockPayload;
    const defaultRow = mapPayloadToRow('user-uuid-123', payloadWithoutMode);
    expect(defaultRow.transport_mode).toBe('car');
  });

  it('mapRowToListItem menghasilkan item ringkas untuk kartu riwayat termasuk transportMode', () => {
    const sampleRow: TripRow = {
      trip_id: 'trip-1',
      user_id: 'user-uuid-123',
      origin_label: 'Asal A',
      destination_label: 'Tujuan B',
      origin_lat: -6.99,
      origin_lng: 110.42,
      destination_lat: -6.96,
      destination_lng: 110.43,
      route_polyline: encodePolyline([[-6.99, 110.42], [-6.96, 110.43]]),
      transport_mode: 'motorcycle',
      distance_m: 5000,
      duration_s: 1200,
      analyzed_at: '2026-10-15T12:00:00Z',
      exposure_index_pm25: 22.4,
      avg_pm25: 19.5,
      aqi_category: 'moderate',
      confidence_level: 'medium',
      coverage_ratio: 0.8,
      data_source: 'simulated',
      fastest_duration_s: 1100,
      fastest_exposure_index_pm25: 28.0,
      was_recommended: true,
      used_exposure_weight: 0.5,
      estimate_details: null,
      algorithm_version: 'v1.0.0',
      created_at: '2026-10-15T12:00:00Z',
    };

    const listItem = mapRowToListItem(sampleRow);
    expect(listItem.tripId).toBe('trip-1');
    expect(listItem.transportMode).toBe('motorcycle');
    expect(listItem.distanceMeters).toBe(5000);
    expect(listItem.category).toBe('moderate');
    expect(listItem.wasRecommended).toBe(true);
  });

  it('mapRowToDetail mendekode polyline dan mengembalikan array koordinat serta transportMode', () => {
    const coords: LatLngTuple[] = [
      [-6.9902, 110.4228],
      [-6.9642, 110.4278],
    ];
    const sampleRow: TripRow = {
      trip_id: 'trip-detail-1',
      user_id: 'user-uuid-123',
      origin_label: 'Asal Detail',
      destination_label: 'Tujuan Detail',
      origin_lat: -6.9902,
      origin_lng: 110.4228,
      destination_lat: -6.9642,
      destination_lng: 110.4278,
      route_polyline: encodePolyline(coords),
      transport_mode: 'walk',
      distance_m: 3500,
      duration_s: 700,
      analyzed_at: '2026-10-15T10:00:00Z',
      exposure_index_pm25: 15.0,
      avg_pm25: 14.0,
      aqi_category: 'good',
      confidence_level: 'high',
      coverage_ratio: 0.9,
      data_source: 'live',
      fastest_duration_s: 700,
      fastest_exposure_index_pm25: 15.0,
      was_recommended: true,
      used_exposure_weight: 0.7,
      estimate_details: {
        maxDataAgeMinutes: 10,
        isPartiallyImputed: false,
        segments: [],
        topContributors: [],
        stationsUsed: [],
      },
      algorithm_version: 'v1.0.0',
      created_at: '2026-10-15T10:00:00Z',
    };

    const detail = mapRowToDetail(sampleRow);
    expect(detail.geometry.length).toBe(2);
    expect(detail.transportMode).toBe('walk');
    expect(detail.geometry[0][0]).toBeCloseTo(-6.9902, 4);
    expect(detail.geometry[1][0]).toBeCloseTo(-6.9642, 4);
    expect(detail.estimate).toBeDefined();
    expect(detail.estimate?.confidenceLevel).toBe('high');
  });
});
