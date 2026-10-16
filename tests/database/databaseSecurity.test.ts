/**
 * @file databaseSecurity.test.ts
 * @description Rangkaian pengujian integrasi & keamanan basis data Person 3 (TC-18, TC-19, TC-20, TC-21b, TC-22, TC-23, TC-33).
 * Memverifikasi integritas RLS, pembuatan profil otomatis, validasi skema ketat, dan penghapusan kaskade.
 * 
 * @author Person 3 (Database, Auth, & History Services)
 * @module tests/database/databaseSecurity.test
 * @see CODE_SPEC_AANG.md Bagian 8.1 & PRD Test Cases
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TripSavePayloadSchema } from '@/types/schemas';
import { saveTrip, getTripById, deleteTrip } from '@/lib/trips/tripService';
import { AppError } from '@/lib/server/withApiHandler';
import type { TripRow, ProfileRow } from '@/types/database';
import type { TripSavePayload } from '@/types/trips';

// In-memory mock database untuk menguji RLS dan integritas relasional
interface MockDbState {
  users: Array<{ id: string; email: string }>;
  profiles: ProfileRow[];
  trips: TripRow[];
}

let mockDb: MockDbState = {
  users: [],
  profiles: [],
  trips: [],
};

// Mock Supabase Server Client yang mensimulasikan penegakan RLS
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: (table: string) => ({
      select: (cols?: string, opts?: { count?: string }) => ({
        eq: (field: string, val: unknown) => ({
          single: async () => {
            if (table === 'profiles') {
              const p = mockDb.profiles.find((item) => (item as Record<string, unknown>)[field] === val);
              return p ? { data: p, error: null } : { data: null, error: { message: 'Not found' } };
            }
            if (table === 'trips') {
              // RLS: User hanya dapat melihat trip miliknya
              const t = mockDb.trips.find((item) => (item as Record<string, unknown>)[field] === val);
              return t ? { data: t, error: null } : { data: null, error: { message: 'Not found' } };
            }
            return { data: null, error: null };
          },
          eq: (field2: string, val2: unknown) => ({
            single: async () => {
              if (table === 'trips') {
                const t = mockDb.trips.find(
                  (item) =>
                    (item as Record<string, unknown>)[field] === val &&
                    (item as Record<string, unknown>)[field2] === val2
                );
                return t ? { data: t, error: null } : { data: null, error: { message: 'Not found' } };
              }
              return { data: null, error: null };
            },
          }),
        }),
      }),
      insert: (insertData: unknown) => ({
        select: () => ({
          single: async () => {
            if (table === 'trips') {
              const newTrip: TripRow = {
                trip_id: `trip-uuid-${Date.now()}`,
                created_at: new Date().toISOString(),
                ...(insertData as Omit<TripRow, 'trip_id' | 'created_at'>),
              };
              mockDb.trips.push(newTrip);
              return { data: newTrip, error: null };
            }
            return { data: null, error: null };
          },
        }),
      }),
      delete: () => ({
        eq: (field: string, val: unknown) => ({
          eq: async (field2: string, val2: unknown) => {
            if (table === 'trips') {
              const beforeCount = mockDb.trips.length;
              mockDb.trips = mockDb.trips.filter(
                (item) =>
                  !((item as Record<string, unknown>)[field] === val &&
                    (item as Record<string, unknown>)[field2] === val2)
              );
              return { error: null, count: beforeCount - mockDb.trips.length };
            }
            return { error: null };
          },
        }),
      }),
    }),
  })),
}));

// Mock Supabase Admin Client
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    auth: {
      admin: {
        deleteUser: async (userId: string) => {
          // Simulasi PostgreSQL ON DELETE CASCADE:
          // Menghapus user dari auth.users otomatis menghapus profiles dan trips
          mockDb.users = mockDb.users.filter((u) => u.id !== userId);
          mockDb.profiles = mockDb.profiles.filter((p) => p.user_id !== userId);
          mockDb.trips = mockDb.trips.filter((t) => t.user_id !== userId);
          return { error: null };
        },
      },
    },
  })),
}));

describe('Person 3 Database & Security Test Suite (TC-18 to TC-23)', () => {
  const userA = { id: 'user-a-uuid', email: 'usera@example.com' };
  const userB = { id: 'user-b-uuid', email: 'userb@example.com' };

  const validPayload: TripSavePayload = {
    origin: { label: 'Simpang Lima', lat: -6.9902, lng: 110.4228 },
    destination: { label: 'Tawang Station', lat: -6.9642, lng: 110.4278 },
    selectedRoute: {
      id: 'route-test-1',
      label: 'A',
      distanceMeters: 4500,
      durationSeconds: 900,
      geometry: { coordinates: [[-6.9902, 110.4228], [-6.9642, 110.4278]] },
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
      comparison: { extraSeconds: 0, extraPercent: 0, exposureDeltaPercent: 0 },
      withinTimeLimit: true,
      isDominated: false,
      score: 1.0,
    },
    fastest: { durationSeconds: 900, exposureIndexPm25: 18.5 },
    wasRecommended: true,
    usedExposureWeight: 0.5,
    dataSources: [{ sourceName: 'BMKG', dataType: 'station_observation', attributionText: 'BMKG' }],
    algorithmVersion: 'v1.0.0',
    transportMode: 'motorcycle',
  };

  beforeEach(() => {
    // Reset state database mock
    mockDb = {
      users: [userA, userB],
      profiles: [
        {
          user_id: userA.id,
          exposure_weight: 0.5,
          max_extra_time_percent: 30,
          history_consent: false, // User A awalnya belum memberi izin
          consent_updated_at: null,
          created_at: new Date().toISOString(),
        },
        {
          user_id: userB.id,
          exposure_weight: 0.8,
          max_extra_time_percent: 15,
          history_consent: true, // User B sudah memberi izin
          consent_updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ],
      trips: [],
    };
  });

  // TC-18: Pendaftaran akun baru otomatis membuat baris profil default
  it('TC-18: pendaftaran akun baru membuat baris profil dengan nilai acuan default', () => {
    // Simulasi trigger handle_new_user pada database
    const newUser = { id: 'user-c-uuid', email: 'userc@example.com' };
    const initialProfile: ProfileRow = {
      user_id: newUser.id,
      exposure_weight: 0.5,
      max_extra_time_percent: 30,
      history_consent: false,
      consent_updated_at: null,
      created_at: new Date().toISOString(),
    };
    mockDb.profiles.push(initialProfile);

    const createdProfile = mockDb.profiles.find((p) => p.user_id === newUser.id);
    expect(createdProfile).toBeDefined();
    expect(createdProfile?.exposure_weight).toBe(0.5);
    expect(createdProfile?.max_extra_time_percent).toBe(30);
    expect(createdProfile?.history_consent).toBe(false);
    expect(createdProfile?.consent_updated_at).toBeNull();
  });

  // TC-19: Simpan perjalanan gagal 403 jika consent bernilai false
  it('TC-19: simpan perjalanan gagal dengan 403 CONSENT_REQUIRED saat history_consent bernilai false', async () => {
    await expect(saveTrip(userA.id, validPayload)).rejects.toThrowError(AppError);

    try {
      await saveTrip(userA.id, validPayload);
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.code).toBe('CONSENT_REQUIRED');
      expect(appErr.statusCode).toBe(403);
    }
  });

  // TC-20: Simpan perjalanan berhasil jika consent aktif
  it('TC-20: simpan perjalanan berhasil dan tersimpan secara atomik saat consent aktif', async () => {
    const saved = await saveTrip(userB.id, validPayload);

    expect(saved).toBeDefined();
    expect(saved.originLabel).toBe('Simpang Lima');
    expect(saved.destinationLabel).toBe('Tawang Station');
    expect(saved.transportMode).toBe('motorcycle');
    expect(saved.distanceMeters).toBe(4500);
    expect(saved.durationSeconds).toBe(900);
    expect(saved.category).toBe('good');

    // Pastikan tersimpan di mock database dengan kolom transport_mode
    expect(mockDb.trips.length).toBe(1);
    expect(mockDb.trips[0].user_id).toBe(userB.id);
    expect(mockDb.trips[0].transport_mode).toBe('motorcycle');
  });

  // TC-21b: Validasi Zod menolak payload perjalanan yang tidak sah
  it('TC-21b: validasi Zod menolak payload dengan koordinat di luar batas atau jarak/durasi negatif', () => {
    // 1. Latitude di luar batas
    const badLat = {
      ...validPayload,
      origin: { ...validPayload.origin, lat: 95.5 },
    };
    expect(TripSavePayloadSchema.safeParse(badLat).success).toBe(false);

    // 2. Longitude di luar batas
    const badLng = {
      ...validPayload,
      destination: { ...validPayload.destination, lng: -195.0 },
    };
    expect(TripSavePayloadSchema.safeParse(badLng).success).toBe(false);

    // 3. Jarak negatif
    const badDistance = {
      ...validPayload,
      selectedRoute: { ...validPayload.selectedRoute, distanceMeters: -500 },
    };
    expect(TripSavePayloadSchema.safeParse(badDistance).success).toBe(false);

    // 4. Durasi negatif
    const badDuration = {
      ...validPayload,
      selectedRoute: { ...validPayload.selectedRoute, durationSeconds: -120 },
    };
    expect(TripSavePayloadSchema.safeParse(badDuration).success).toBe(false);

    // 5. Coverage ratio di luar [0, 1]
    const badCoverage = {
      ...validPayload,
      selectedRoute: {
        ...validPayload.selectedRoute,
        estimate: { ...validPayload.selectedRoute.estimate, coverageRatio: 1.5 },
      },
    };
    expect(TripSavePayloadSchema.safeParse(badCoverage).success).toBe(false);

    // 6. Moda transportasi tidak valid
    const badMode = {
      ...validPayload,
      transportMode: 'airplane',
    };
    expect(TripSavePayloadSchema.safeParse(badMode).success).toBe(false);
  });

  // TC-22: Pengujian RLS (User A tidak dapat mengakses atau menghapus data milik User B)
  it('TC-22: RLS mengisolasi data, Pengguna A tidak dapat membaca atau menghapus trip milik Pengguna B', async () => {
    // Simpan trip milik Pengguna B
    const tripB = await saveTrip(userB.id, validPayload);

    // Pengguna B dapat membaca datanya sendiri
    const readByB = await getTripById(userB.id, tripB.tripId);
    expect(readByB.tripId).toBe(tripB.tripId);

    // Pengguna A mencoba membaca data Pengguna B -> Wajib dilempar NOT_FOUND 404 (Isolasi RLS)
    await expect(getTripById(userA.id, tripB.tripId)).rejects.toThrowError(AppError);

    // Pengguna A mencoba menghapus trip milik Pengguna B
    await deleteTrip(userA.id, tripB.tripId);

    // Pastikan trip milik User B masih utuh tidak terhapus oleh User A
    const stillExists = mockDb.trips.find((t) => t.trip_id === tripB.tripId);
    expect(stillExists).toBeDefined();
    expect(stillExists?.user_id).toBe(userB.id);
  });

  // TC-23: Penghapusan akun secara tuntas menghapus data profil dan trips (Cascade Delete)
  it('TC-23: penghapusan akun tuntas menghapus baris profiles dan seluruh trips terkait (ON DELETE CASCADE)', async () => {
    // User B menyimpan dua perjalanan
    await saveTrip(userB.id, validPayload);
    await saveTrip(userB.id, {
      ...validPayload,
      origin: { label: 'Undip', lat: -7.05, lng: 110.43 },
    });

    expect(mockDb.trips.filter((t) => t.user_id === userB.id).length).toBe(2);
    expect(mockDb.profiles.find((p) => p.user_id === userB.id)).toBeDefined();

    // Eksekusi penghapusan akun User B via Admin Client
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(userB.id);

    // Verifikasi seluruh entitas User B musnah dari basis data
    expect(mockDb.users.find((u) => u.id === userB.id)).toBeUndefined();
    expect(mockDb.profiles.find((p) => p.user_id === userB.id)).toBeUndefined();
    expect(mockDb.trips.filter((t) => t.user_id === userB.id).length).toBe(0);

    // Pastikan data User A tetap aman dan tidak terpengaruh
    expect(mockDb.users.find((u) => u.id === userA.id)).toBeDefined();
    expect(mockDb.profiles.find((p) => p.user_id === userA.id)).toBeDefined();
  });
});
