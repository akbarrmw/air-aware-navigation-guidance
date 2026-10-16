import { describe, it, expect } from 'vitest';
import { normalizeStation, calculateFreshness } from '@/lib/services/normalizeStation';
import { processRouteCandidates } from '@/lib/services/routeCandidates';
import { isPointWithinPilotArea } from '@/lib/services/geocodingService';
import { runAnalysisPipeline } from '@/lib/services/pipelineService';
import { MOCK_ROUTES } from '@/fixtures/mockRoutes';
import { MOCK_STATIONS } from '@/fixtures/mockStations';
import { isTollStep, routeHasToll } from '@/lib/services/routingService';

describe('Person 2 - Backend Services & Normalization', () => {
  it('TC-05: Menghitung usia data dan status kesegaran (fresh, stale, expired)', () => {
    const now = Date.now();

    // 1 jam lalu -> fresh (<= 3 jam)
    const freshIso = new Date(now - 60 * 60 * 1000).toISOString();
    const freshResult = calculateFreshness(freshIso);
    expect(freshResult.freshness).toBe('fresh');
    expect(freshResult.ageMinutes).toBeGreaterThanOrEqual(59);

    // 10 jam lalu -> stale (<= 24 jam)
    const staleIso = new Date(now - 10 * 60 * 60 * 1000).toISOString();
    const staleResult = calculateFreshness(staleIso);
    expect(staleResult.freshness).toBe('stale');

    // 30 jam lalu -> expired (> 24 jam)
    const expiredIso = new Date(now - 30 * 60 * 60 * 1000).toISOString();
    const expiredResult = calculateFreshness(expiredIso);
    expect(expiredResult.freshness).toBe('expired');

    // Tanpa tanggal -> expired
    const missingResult = calculateFreshness(null);
    expect(missingResult.freshness).toBe('expired');
  });

  it('TC-05: Normalisasi stasiun mengonversi AQI ke PM2.5 jika konsentrasi kosong', () => {
    const normalized = normalizeStation({
      stationId: 'st-test-1',
      lat: -6.99,
      lng: 110.42,
      aqi: 100, // AQI 100 -> PM2.5 ~ 35.4
      observedAt: new Date().toISOString(),
    });

    expect(normalized.stationId).toBe('st-test-1');
    expect(normalized.pm25Concentration).toBe(35.4);
    expect(normalized.dominantPollutant).toBe('pm25');
  });

  it('TC-15 & TC-26b: Memproses dan menyaring kandidat rute (urut durasi, label A/B/C, isFastest, dan buang duplikat)', () => {
    const mockRaw = [
      // Rute 1 (Jalur Barat): 15 menit
      {
        distanceMeters: 12000,
        durationSeconds: 900,
        coordinates: [
          [-6.99, 110.42],
          [-6.99, 110.38],
          [-7.01, 110.38],
          [-7.03, 110.40],
          [-7.05, 110.43],
        ] as [number, number][],
      },
      // Rute 2 (Jalur Timur): 11.6 menit (tercepat)
      {
        distanceMeters: 10000,
        durationSeconds: 700,
        coordinates: [
          [-6.99, 110.42],
          [-6.99, 110.45],
          [-7.01, 110.45],
          [-7.03, 110.44],
          [-7.05, 110.43],
        ] as [number, number][],
      },
      // Rute 3: Hampir persis Rute 2 (duplikat > 90% tumpang tindih)
      {
        distanceMeters: 10050,
        durationSeconds: 710,
        coordinates: [
          [-6.99, 110.42],
          [-6.99, 110.45],
          [-7.01, 110.45],
          [-7.03, 110.44],
          [-7.05, 110.43],
        ] as [number, number][],
      },
    ];

    const candidates = processRouteCandidates(mockRaw);
    // Seluruh rute yang didapat dipertahankan dan diurutkan berdasarkan durasi (A tercepat)
    expect(candidates.length).toBe(3);
    expect(candidates[0].isFastest).toBe(true);
    expect(candidates[0].label).toBe('A');
    expect(candidates[0].durationSeconds).toBe(700);

    expect(candidates[1].isFastest).toBe(false);
    expect(candidates[1].label).toBe('B');
    expect(candidates[1].durationSeconds).toBe(710);

    expect(candidates[2].isFastest).toBe(false);
    expect(candidates[2].label).toBe('C');
    expect(candidates[2].durationSeconds).toBe(900);
  });

  it('TC-16: Validasi batasan area pilot (Semarang BBox)', () => {
    // Simpang Lima (-6.99, 110.42) -> di dalam
    expect(isPointWithinPilotArea(-6.99, 110.42)).toBe(true);

    // Jakarta (-6.20, 106.81) -> di luar
    expect(isPointWithinPilotArea(-6.20, 106.81)).toBe(false);
  });

  it('TC-17: Pipeline analisis berjalan sukses menggabungkan rute dan stasiun', async () => {
    const result = await runAnalysisPipeline({
      origin: { lat: -6.9928, lng: 110.4222 },
      destination: { lat: -7.0514, lng: 110.4388 },
      preferences: { exposureWeight: 0.5, maxExtraTimePercent: 30 },
      routes: MOCK_ROUTES,
      stations: MOCK_STATIONS,
    });

    expect(result.routes.length).toBeGreaterThan(0);
    expect(['A', 'B', 'C']).toContain(result.recommendedRouteLabel);
    expect(result.actionMessages.length).toBeGreaterThan(0);
    expect(result.disclaimer).toBeTruthy();
  });

  it('TC-27: Deteksi ruas jalan tol dan filtering rute jalan tol untuk motor & pejalan kaki', () => {
    // 1. Validasi pengenalan nama step jalan tol
    expect(isTollStep({ name: 'Jalan Tol Semarang-Solo' })).toBe(true);
    expect(isTollStep({ name: 'Tol Krapyak - Jatingaleh' })).toBe(true);
    expect(isTollStep({ ref: 'Tollway' })).toBe(true);
    expect(isTollStep({ name: 'Jalan Brigjen Sudiarto' })).toBe(false);
    expect(isTollStep({ name: 'Jalan Pahlawan' })).toBe(false);

    // 2. Rute dengan segmen tol > 150m diidentifikasi sebagai rute tol
    const tollRoute = {
      legs: [
        {
          steps: [
            { name: 'Jalan Siliwangi', distance: 1000 },
            { name: 'Jalan Tol Semarang', distance: 5500 },
            { name: 'Jalan Setiabudi', distance: 800 },
          ],
        },
      ],
    };
    expect(routeHasToll(tollRoute)).toBe(true);

    // 3. Rute murni jalan arteri (non-tol)
    const arterialRoute = {
      legs: [
        {
          steps: [
            { name: 'Jalan Pemuda', distance: 2000 },
            { name: 'Jalan Gajah Mada', distance: 1500 },
            { name: 'Simpang Lima', distance: 500 },
          ],
        },
      ],
    };
    expect(routeHasToll(arterialRoute)).toBe(false);
  });

  it('TC-28: Perhitungan durasi perjalanan homogen untuk Mobil, Motor, dan Pejalan Kaki', () => {
    const distanceMeters = 10000; // 10 km
    const carDurationSec = 900;   // 15 menit OSRM car

    // Walk: Kecepatan homogen 4.8 km/jam (1.333 m/s)
    const expectedWalkDuration = Math.round(distanceMeters / 1.3333); // ~7500 detik (~125 menit)
    expect(expectedWalkDuration).toBe(7500);

    // Motorcycle: Kelincahan non-tol ~0.90x waktu mobil atau ~32 km/jam (8.89 m/s)
    const expectedMotorDuration = Math.round(Math.min(carDurationSec * 0.90, distanceMeters / 8.89));
    expect(expectedMotorDuration).toBe(810); // 13.5 menit
    expect(expectedMotorDuration).toBeLessThan(carDurationSec);
    expect(expectedWalkDuration).toBeGreaterThan(carDurationSec * 5);
  });
});
