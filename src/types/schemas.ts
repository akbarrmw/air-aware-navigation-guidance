/**
 * Skema validasi Zod untuk permintaan API klien dan server.
 */

import { z } from 'zod';

// ==========================================
// 1. Skema Koordinat & Lokasi
// ==========================================

/**
 * Validasi koordinat latitude (-90 s/d 90).
 */
export const LatitudeSchema = z
  .number({ message: 'Latitude wajib berupa angka' })
  .min(-90, 'Latitude minimal -90')
  .max(90, 'Latitude maksimal 90');

/**
 * Validasi koordinat longitude (-180 s/d 180).
 */
export const LongitudeSchema = z
  .number({ message: 'Longitude wajib berupa angka' })
  .min(-180, 'Longitude minimal -180')
  .max(180, 'Longitude maksimal 180');

/**
 * Skema titik lokasi dengan label opsional.
 */
export const LocationPointSchema = z.object({
  label: z.string().max(200, 'Label lokasi maksimal 200 karakter').optional(),
  lat: LatitudeSchema,
  lng: LongitudeSchema,
});

// ==========================================
// 2. Skema Query Geocoding & Stasiun
// ==========================================

/**
 * Validasi parameter query geocoding (/api/geocode?q=...).
 */
export const GeocodeQuerySchema = z.object({
  q: z
    .string({ message: 'Query pencarian wajib diisi' })
    .trim()
    .min(2, 'Query minimal 2 karakter')
    .max(100, 'Query maksimal 100 karakter'),
});
export type GeocodeQueryInput = z.infer<typeof GeocodeQuerySchema>;

/**
 * Validasi query bounding box stasiun kualitas udara (/api/air-quality/stations?south=...&west=...&north=...&east=...).
 */
export const StationsQuerySchema = z.object({
  south: z.coerce.number().min(-90).max(90),
  west: z.coerce.number().min(-180).max(180),
  north: z.coerce.number().min(-90).max(90),
  east: z.coerce.number().min(-180).max(180),
});
export type StationsQueryInput = z.infer<typeof StationsQuerySchema>;

// ==========================================
// 3. Skema Preferensi Rute
// ==========================================

/**
 * Validasi preferensi optimasi perutean pengguna.
 */
export const RoutePreferencesSchema = z.object({
  /** Bobot paparan polusi vs kecepatan (0.0 s/d 1.0) */
  exposureWeight: z
    .number()
    .min(0, 'Bobot paparan minimal 0')
    .max(1, 'Bobot paparan maksimal 1')
    .default(0.5),
  /** Toleransi tambahan waktu dalam persen (0 s/d 100) atau null bila tidak dibatasi */
  maxExtraTimePercent: z
    .number()
    .min(0, 'Toleransi tambahan waktu minimal 0%')
    .max(100, 'Toleransi tambahan waktu maksimal 100%')
    .nullable()
    .default(30),
});
export type RoutePreferencesInput = z.infer<typeof RoutePreferencesSchema>;

// ==========================================
// 4. Skema Permohonan Analisis Rute
// ==========================================

/**
 * Validasi permohonan analisis rute (/api/routes/analyze).
 */
export const AnalyzeRoutesRequestSchema = z.object({
  origin: LocationPointSchema,
  destination: LocationPointSchema,
  waypoints: z.array(LocationPointSchema).max(5, 'Maksimal 5 titik singgah').optional(),
  preferences: RoutePreferencesSchema.default({
    exposureWeight: 0.5,
    maxExtraTimePercent: 30,
  }),
  transportMode: z.enum(['car', 'motorcycle', 'walk']).default('car').optional(),
});
export type AnalyzeRoutesRequestInput = z.infer<typeof AnalyzeRoutesRequestSchema>;

// ==========================================
// 5. Skema Riwayat Perjalanan (Trips)
// ==========================================

/**
 * Validasi pengiriman snapshot rute untuk disimpan ke riwayat (/api/trips).
 */
export const TripSavePayloadSchema = z.object({
  origin: LocationPointSchema,
  destination: LocationPointSchema,
  selectedRoute: z.object({
    id: z.string(),
    label: z.enum(['A', 'B', 'C']),
    distanceMeters: z.number().positive(),
    durationSeconds: z.number().positive(),
    geometry: z.object({
      coordinates: z.array(z.tuple([LatitudeSchema, LongitudeSchema])),
    }),
    isFastest: z.boolean(),
    estimate: z.object({
      exposureIndexPm25: z.number().nullable(),
      avgPm25: z.number().nullable(),
      category: z.string().nullable(),
      coverageRatio: z.number().min(0).max(1),
      confidenceLevel: z.enum(['high', 'medium', 'low', 'unavailable']),
      maxDataAgeMinutes: z.number().nullable(),
      isPartiallyImputed: z.boolean(),
      segments: z.array(z.any()),
      topContributors: z.array(z.any()),
      stationsUsed: z.array(z.any()),
    }),
    comparison: z.object({
      extraSeconds: z.number(),
      extraPercent: z.number(),
      exposureDeltaPercent: z.number().nullable(),
    }),
    withinTimeLimit: z.boolean(),
    isDominated: z.boolean(),
    score: z.number().nullable(),
  }),
  fastest: z.object({
    durationSeconds: z.number().positive(),
    exposureIndexPm25: z.number().nullable(),
  }),
  wasRecommended: z.boolean(),
  usedExposureWeight: z.number().min(0).max(1),
  dataSources: z.array(
    z.object({
      sourceName: z.string(),
      dataType: z.enum(['station_observation', 'model_fallback', 'simulation']),
      attributionText: z.string(),
      observedRange: z
        .object({
          oldest: z.string(),
          newest: z.string(),
        })
        .optional(),
    })
  ),
  algorithmVersion: z.string(),
  transportMode: z.enum(['car', 'motorcycle', 'walk']).default('car').optional(),
});
export type TripSavePayloadInput = z.infer<typeof TripSavePayloadSchema>;

/**
 * Validasi query daftar riwayat perjalanan (/api/trips?page=1&pageSize=10).
 */
export const TripListQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'Halaman minimal 1').default(1),
  pageSize: z.coerce.number().int().min(1).max(50, 'Maksimal 50 item per halaman').default(10),
});
export type TripListQueryInput = z.infer<typeof TripListQuerySchema>;

// ==========================================
// 6. Skema Pengaturan & Akun Pengguna
// ==========================================

/**
 * Validasi payload preferensi profil pengguna (/api/preferences).
 */
export const PreferencesPayloadSchema = RoutePreferencesSchema.extend({
  historyConsent: z.boolean({ message: 'Status consent wajib ditentukan' }),
});
export type PreferencesPayloadInput = z.infer<typeof PreferencesPayloadSchema>;

/**
 * Validasi persetujuan penyimpanan riwayat perjalanan (/api/account/consent).
 */
export const ConsentPayloadSchema = z.object({
  historyConsent: z.boolean({ message: 'historyConsent wajib boolean' }),
});
export type ConsentPayloadInput = z.infer<typeof ConsentPayloadSchema>;

/**
 * Validasi konfirmasi penghapusan akun pengguna (/api/account/delete).
 */
export const DeleteAccountPayloadSchema = z.object({
  password: z
    .string({ message: 'Kata sandi wajib diisi untuk verifikasi penghapusan akun' })
    .min(1, 'Kata sandi tidak boleh kosong'),
});
export type DeleteAccountPayloadInput = z.infer<typeof DeleteAccountPayloadSchema>;
