/**
 * @file tripService.test.ts
 * @description Unit tests untuk layanan penyimpanan riwayat dan verifikasi persetujuan (TC-19, TC-20).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveTrip, listTrips, getTripById, deleteTrip, deleteAllTrips } from '@/lib/trips/tripService';
import { AppError } from '@/lib/server/withApiHandler';
import type { TripSavePayload } from '@/types/trips';

// Mock Supabase server client
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockOrder = vi.fn();
const mockRange = vi.fn();

let mockProfileConsent = false;

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(async () => {
            return {
              data: { history_consent: mockProfileConsent },
              error: null,
            };
          }),
        };
      }
      if (table === 'trips') {
        return {
          insert: vi.fn((row) => ({
            select: vi.fn().mockReturnThis(),
            single: vi.fn(async () => ({
              data: {
                trip_id: 'mock-trip-uuid',
                created_at: new Date().toISOString(),
                ...row,
              },
              error: null,
            })),
          })),
          select: vi.fn().mockImplementation((_cols, opts) => {
            if (opts?.count === 'exact') {
              return {
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                range: vi.fn(async () => ({
                  data: [
                    {
                      trip_id: 'trip-1',
                      user_id: 'user-1',
                      origin_label: 'Asal',
                      destination_label: 'Tujuan',
                      origin_lat: -6.99,
                      origin_lng: 110.42,
                      destination_lat: -6.96,
                      destination_lng: 110.43,
                      route_polyline: 'mock_poly',
                      distance_m: 2000,
                      duration_s: 300,
                      analyzed_at: '2026-10-15T12:00:00Z',
                      exposure_index_pm25: 15,
                      avg_pm25: 15,
                      aqi_category: 'good',
                      confidence_level: 'high',
                      coverage_ratio: 1.0,
                      data_source: 'live',
                      fastest_duration_s: 300,
                      fastest_exposure_index_pm25: 15,
                      was_recommended: true,
                      used_exposure_weight: 0.5,
                      estimate_details: null,
                      algorithm_version: 'v1.0.0',
                      created_at: '2026-10-15T12:00:00Z',
                    },
                  ],
                  count: 1,
                  error: null,
                })),
              };
            }
            return {
              eq: vi.fn((field, val) => {
                if (val === 'not-found-id') {
                  return {
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn(async () => ({ data: null, error: { message: 'Not found' } })),
                  };
                }
                return {
                  eq: vi.fn().mockReturnThis(),
                  single: vi.fn(async () => ({
                    data: {
                      trip_id: val,
                      user_id: 'user-1',
                      origin_label: 'A',
                      destination_label: 'B',
                      origin_lat: -6.99,
                      origin_lng: 110.42,
                      destination_lat: -6.96,
                      destination_lng: 110.43,
                      route_polyline: '',
                      distance_m: 1000,
                      duration_s: 200,
                      analyzed_at: '2026-10-15T12:00:00Z',
                      confidence_level: 'high',
                      fastest_duration_s: 200,
                      fastest_exposure_index_pm25: null,
                      was_recommended: true,
                      used_exposure_weight: 0.5,
                      data_source: 'simulated',
                      algorithm_version: 'v1.0.0',
                      created_at: '2026-10-15T12:00:00Z',
                    },
                    error: null,
                  })),
                };
              }),
            };
          }),
          delete: vi.fn(() => ({
            eq: vi.fn().mockReturnThis(),
            then: vi.fn((cb) => cb({ error: null })),
          })),
        };
      }
      return {};
    }),
  })),
}));

describe('Trip Service & Consent Enforcement', () => {
  const dummyPayload: TripSavePayload = {
    origin: { label: 'Asal', lat: -6.99, lng: 110.42 },
    destination: { label: 'Tujuan', lat: -6.96, lng: 110.43 },
    selectedRoute: {
      id: 'r1',
      label: 'A',
      distanceMeters: 2000,
      durationSeconds: 300,
      geometry: { coordinates: [[-6.99, 110.42], [-6.96, 110.43]] },
      isFastest: true,
      estimate: {
        exposureIndexPm25: 15,
        avgPm25: 15,
        category: 'good',
        coverageRatio: 1,
        confidenceLevel: 'high',
        maxDataAgeMinutes: 5,
        isPartiallyImputed: false,
        segments: [],
        topContributors: [],
        stationsUsed: [],
      },
      comparison: { extraSeconds: 0, extraPercent: 0, exposureDeltaPercent: 0 },
      withinTimeLimit: true,
      isDominated: false,
      score: 1,
    },
    fastest: { durationSeconds: 300, exposureIndexPm25: 15 },
    wasRecommended: true,
    usedExposureWeight: 0.5,
    dataSources: [],
    algorithmVersion: 'v1.0.0',
  };

  beforeEach(() => {
    mockProfileConsent = false;
  });

  it('TC-19: menolak penyimpanan perjalanan dengan 403 CONSENT_REQUIRED jika consent bernilai false', async () => {
    mockProfileConsent = false;

    await expect(saveTrip('user-uuid-1', dummyPayload)).rejects.toThrowError(AppError);

    try {
      await saveTrip('user-uuid-1', dummyPayload);
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.code).toBe('CONSENT_REQUIRED');
      expect(appErr.statusCode).toBe(403);
    }
  });

  it('TC-20: berhasil menyimpan perjalanan jika history_consent bernilai true', async () => {
    mockProfileConsent = true;

    const result = await saveTrip('user-uuid-1', dummyPayload);
    expect(result).toBeDefined();
    expect(result.tripId).toBe('mock-trip-uuid');
    expect(result.originLabel).toBe('Asal');
  });

  it('listTrips mengembalikan daftar terpaginasi dengan total dan totalPages', async () => {
    const list = await listTrips('user-1', 1, 10);
    expect(list.items.length).toBe(1);
    expect(list.total).toBe(1);
    expect(list.page).toBe(1);
    expect(list.totalPages).toBe(1);
  });

  it('getTripById melempar NOT_FOUND 404 jika ID perjalanan tidak ditemukan', async () => {
    await expect(getTripById('user-1', 'not-found-id')).rejects.toThrowError(AppError);
  });

  it('getTripById mengembalikan detail saat data ditemukan', async () => {
    const trip = await getTripById('user-1', 'valid-trip-id');
    expect(trip).toBeDefined();
    expect(trip.tripId).toBe('valid-trip-id');
  });

  it('deleteTrip dan deleteAllTrips berjalan dengan sukses', async () => {
    const res1 = await deleteTrip('user-1', 'trip-1');
    expect(res1.success).toBe(true);

    const res2 = await deleteAllTrips('user-1');
    expect(res2.success).toBe(true);
  });
});
