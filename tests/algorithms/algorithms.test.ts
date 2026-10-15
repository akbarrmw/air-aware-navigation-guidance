/**
 * @file algorithms.test.ts
 * @description Rangkaian pengujian unit komprehensif untuk mesin algoritma Person 1 (AANG).
 * Menguji TC-01 s/d TC-10 dan TC-26a sesuai target verifikasi Gate G1.
 * 
 * @author Person 1 (Core Algorithm & System Integration)
 * @see CODE_SPEC_AANG.md Bagian 14 & list_person1.md Tahap 3
 */

import { describe, it, expect } from 'vitest';
import {
  haversineMeters,
  haversineDistanceMeters,
  pathLengthMeters,
  splitPath,
  aqiToPm25,
  pm25ToCategory,
  pm25ToCategoryLabel,
  AQI_BREAKPOINT_VERSION,
  idwAtPoint,
  determineConfidenceLevel,
  computeRouteExposure,
  decideRoutes,
  evaluateRecommendations,
} from '@/lib/algorithms';
import type { StationData } from '@/types/air-quality';
import type { RouteCandidate } from '@/types/routing';
import { DEFAULT_ALGORITHM_PARAMS } from '@/config/parameters';

describe('1. Matematika Geodesik & Segmentasi (ALG-01, TC-02, TC-26a)', () => {
  it('Haversine distance antar titik yang sama adalah 0 meter', () => {
    expect(haversineDistanceMeters(-6.99, 110.42, -6.99, 110.42)).toBe(0);
    expect(haversineMeters([-6.99, 110.42], [-6.99, 110.42])).toBe(0);
  });

  it('TC-26a: Rute sangat pendek (< 500m) menghasilkan tepat 1 segmen utuh', () => {
    // Jarak ~200 meter
    const shortCoords: [number, number][] = [
      [-6.9928, 110.4222],
      [-6.9946, 110.4222],
    ];
    const segments = splitPath(shortCoords, 500);

    expect(segments).toHaveLength(1);
    expect(segments[0].index).toBe(0);
    expect(segments[0].lengthMeters).toBeLessThan(500);
  });

  it('TC-02: Rute ~1.2 km terbagi menjadi segmen 500m, 500m, dan ~200m', () => {
    // 0.01 derajat latitude ~ 1111 meter
    const coords: [number, number][] = [
      [-7.000, 110.42],
      [-7.011, 110.42], // ~1220 meter
    ];
    const totalDist = pathLengthMeters(coords);
    expect(totalDist).toBeGreaterThan(1100);

    const segments = splitPath(coords, 500);
    expect(segments.length).toBe(3);
    expect(segments[0].lengthMeters).toBe(500);
    expect(segments[1].lengthMeters).toBe(500);
    expect(segments[2].lengthMeters).toBeLessThan(500);
  });
});

describe('2. Konversi AQI & Kategori (ALG-01, TC-06)', () => {
  it('TC-06: Mengonversi AQI 50 menjadi konsentrasi 12.0 µg/m³ (Baik)', () => {
    const pm25 = aqiToPm25(50);
    expect(pm25).toBe(12.0);
    expect(pm25ToCategory(pm25)).toBe('good');
    expect(pm25ToCategoryLabel(pm25)).toBe('Baik');
  });

  it('TC-06: Mengonversi AQI 100 menjadi konsentrasi 35.4 µg/m³ (Sedang)', () => {
    const pm25 = aqiToPm25(100);
    expect(pm25).toBe(35.4);
    expect(pm25ToCategory(pm25)).toBe('moderate');
    expect(pm25ToCategoryLabel(pm25)).toBe('Sedang');
  });

  it('TC-06: Mengonversi AQI 150 menjadi batas Sensitif (55.4 µg/m³)', () => {
    const pm25 = aqiToPm25(150);
    expect(pm25).toBe(55.4);
    expect(pm25ToCategory(pm25)).toBe('unhealthySensitive');
  });

  it('TC-06: Menangani edge cases (null, negatif, clamping > 500)', () => {
    expect(aqiToPm25(null)).toBeNull();
    expect(aqiToPm25(-5)).toBeNull();
    expect(aqiToPm25(550)).toBe(500.4);
    expect(pm25ToCategory(null)).toBeNull();
    expect(AQI_BREAKPOINT_VERSION).toBe('US-EPA-PM25-2024');
  });
});

describe('3. Interpolasi Spasial IDW (ALG-02, TC-03, TC-04)', () => {
  const dummyStation = (id: string, lat: number, lng: number, pm25: number): StationData => ({
    stationId: id,
    stationName: `Station ${id}`,
    lat,
    lng,
    aqi: 50,
    dominantPollutant: 'pm25',
    pm25Concentration: pm25,
    pm25Origin: 'measured',
    pm10Concentration: 30,
    observedAt: new Date().toISOString(),
    ageMinutes: 30,
    freshness: 'fresh',
    dataType: 'simulation',
    sourceName: 'Dummy St',
  });

  it('TC-03: Stasiun tunggal menghasilkan konsentrasi tepat sama dengan stasiun tersebut', () => {
    const st = dummyStation('st-1', -6.99, 110.42, 25.0);
    const result = idwAtPoint([-6.995, 110.42], [st]);

    expect(result.pm25).toBe(25.0);
    expect(result.stationsUsed).toHaveLength(1);
    expect(result.uncertaintyClass).toBe('near');
  });

  it('TC-03: Dua stasiun berjarak simetris menghasilkan rata-rata seimbang', () => {
    // Titik target di tengah-tengah (-7.00, 110.42)
    const st1 = dummyStation('st-1', -6.99, 110.42, 20.0); // 0.01 utara
    const st2 = dummyStation('st-2', -7.01, 110.42, 40.0); // 0.01 selatan
    const result = idwAtPoint([-7.00, 110.42], [st1, st2]);

    expect(result.pm25).toBe(30.0);
    expect(result.stationsUsed).toHaveLength(2);
  });

  it('TC-03: Anti-singularitas ketika titik < 100m dari stasiun', () => {
    // Jarak ~20 meter
    const st = dummyStation('st-1', -6.99000, 110.42000, 45.8);
    const result = idwAtPoint([-6.99015, 110.42000], [st]);

    expect(result.pm25).toBe(45.8);
    expect(result.nearestDistanceMeters).toBeLessThan(100);
    expect(result.uncertaintyClass).toBe('near');
  });

  it('TC-04: Titik tanpa stasiun dalam radius 10 km menghasilkan null (bukan 0)', () => {
    // Stasiun berjarak > 50 km di Jakarta
    const stFar = dummyStation('st-far', -6.20, 106.81, 80.0);
    const result = idwAtPoint([-6.99, 110.42], [stFar]);

    expect(result.pm25).toBeNull();
    expect(result.stationsUsed).toHaveLength(0);
    expect(result.uncertaintyClass).toBe('none');
  });
});

describe('4. Evaluasi Confidence Level (M-04, TC-07)', () => {
  it('TC-07: Cakupan < 20% menghasilkan unavailable', () => {
    const level = determineConfidenceLevel({
      coverageRatio: 0.15,
      nearbyStationDurationRatio: 0.8,
      maxDataAgeMinutes: 30,
      hasExpiredData: false,
    });
    expect(level).toBe('unavailable');
  });

  it('TC-07: Cakupan tinggi, stasiun dekat, dan data fresh menghasilkan High', () => {
    const level = determineConfidenceLevel({
      coverageRatio: 0.85,
      nearbyStationDurationRatio: 0.60,
      maxDataAgeMinutes: 60,
      hasExpiredData: false,
      hasModelFallback: false,
    });
    expect(level).toBe('high');
  });

  it('TC-07: Model fallback membatasi keyakinan maksimal di Medium', () => {
    const level = determineConfidenceLevel({
      coverageRatio: 0.95,
      nearbyStationDurationRatio: 0.90,
      maxDataAgeMinutes: 30,
      hasExpiredData: false,
      hasModelFallback: true, // Membatasi
    });
    expect(level).toBe('medium');
  });

  it('TC-07: Cakupan 30% menghasilkan Low', () => {
    const level = determineConfidenceLevel({
      coverageRatio: 0.30,
      nearbyStationDurationRatio: 0.10,
      maxDataAgeMinutes: 120,
      hasExpiredData: false,
    });
    expect(level).toBe('low');
  });
});

describe('5. Estimasi Paparan Perjalanan (ALG-01, TC-01)', () => {
  it('TC-01: Konsentrasi konstan 20 µg/m³ selama 10 menit menghasilkan EI = 200 dan avg = 20', () => {
    const route: RouteCandidate = {
      id: 'test-r1',
      label: 'A',
      distanceMeters: 5000,
      durationSeconds: 600, // 10 menit
      geometry: {
        coordinates: [
          [-6.99, 110.42],
          [-7.01, 110.42],
        ],
      },
      isFastest: true,
    };

    // Stasiun tepat di tengah rute dengan PM2.5 = 20.0
    const station: StationData = {
      stationId: 'st-mid',
      stationName: 'Stasiun Tengah',
      lat: -7.00,
      lng: 110.42,
      aqi: 68,
      dominantPollutant: 'pm25',
      pm25Concentration: 20.0,
      pm25Origin: 'measured',
      pm10Concentration: 30,
      observedAt: new Date().toISOString(),
      ageMinutes: 30,
      freshness: 'fresh',
      dataType: 'simulation',
      sourceName: 'Mid Station',
    };

    const estimate = computeRouteExposure({
      route,
      stations: [station],
    });

    expect(estimate.exposureIndexPm25).toBe(200.0);
    expect(estimate.avgPm25).toBe(20.0);
    expect(estimate.category).toBe('moderate');
    expect(estimate.confidenceLevel).not.toBe('unavailable');
  });
});

describe('6. Pengambilan Keputusan Rekomendasi Rute (ALG-03, TC-08, TC-09, TC-10)', () => {
  const routeA: RouteCandidate & { estimate: any } = {
    id: 'route-a',
    label: 'A',
    distanceMeters: 8000,
    durationSeconds: 1200, // 20 menit (Tercepat)
    geometry: { coordinates: [[-6.99, 110.42], [-7.02, 110.42]] },
    isFastest: true,
    estimate: {
      exposureIndexPm25: 600, // 30 µg/m³ * 20 mnt
      avgPm25: 30.0,
      category: 'moderate',
      coverageRatio: 1.0,
      confidenceLevel: 'high',
      maxDataAgeMinutes: 30,
      isPartiallyImputed: false,
      segments: [],
      topContributors: [],
      stationsUsed: [],
    },
  };

  const routeB: RouteCandidate & { estimate: any } = {
    id: 'route-b',
    label: 'B',
    distanceMeters: 9000,
    durationSeconds: 1380, // 23 menit (+15%)
    geometry: { coordinates: [[-6.99, 110.42], [-7.02, 110.43]] },
    isFastest: false,
    estimate: {
      exposureIndexPm25: 506, // (-15.6% EI dibanding A)
      avgPm25: 22.0,
      category: 'moderate',
      coverageRatio: 1.0,
      confidenceLevel: 'high',
      maxDataAgeMinutes: 30,
      isPartiallyImputed: false,
      segments: [],
      topContributors: [],
      stationsUsed: [],
    },
  };

  it('TC-08: Bobot 0.5 (seimbang) memilih Rute B yang lebih bersih (+15% waktu, -15.6% polusi)', () => {
    const decision = decideRoutes({
      routes: [routeA, routeB],
      preferences: { exposureWeight: 0.5, maxExtraTimePercent: 30 },
    });

    expect(decision.recommendedRouteLabel).toBe('B');
    expect(decision.explanation.reasonCode).toBe('BETTER_EXPOSURE');
  });

  it('TC-08: Bobot 0.2 (mengutamakan kecepatan) memilih Rute A (tercepat)', () => {
    const decision = decideRoutes({
      routes: [routeA, routeB],
      preferences: { exposureWeight: 0.2, maxExtraTimePercent: 30 },
    });

    expect(decision.recommendedRouteLabel).toBe('A');
    expect(decision.explanation.reasonCode).toBe('FASTEST_IS_BEST');
  });

  it('TC-09: Rute B yang melebihi batas waktu tambahan (misal maxExtraTimePercent: 10%) tidak direkomendasikan', () => {
    // Rute B membutuhkan tambahan +15%, melebihi limit 10%
    const decision = decideRoutes({
      routes: [routeA, routeB],
      preferences: { exposureWeight: 0.8, maxExtraTimePercent: 10 },
    });

    expect(decision.recommendedRouteLabel).toBe('A');
  });

  it('TC-10: Selisih EI < 5% (tidak signifikan) merekomendasikan rute tercepat', () => {
    const routeBSlightlyBetter: RouteCandidate & { estimate: any } = {
      ...routeB,
      estimate: {
        ...routeB.estimate,
        exposureIndexPm25: 585, // Hanya -2.5% dibanding 600
      },
    };

    const decision = decideRoutes({
      routes: [routeA, routeBSlightlyBetter],
      preferences: { exposureWeight: 0.7, maxExtraTimePercent: 30 },
    });

    expect(decision.recommendedRouteLabel).toBe('A');
    expect(decision.explanation.reasonCode).toBe('DIFFERENCE_NOT_SIGNIFICANT');
  });

  it('TC-11: Rute tanpa estimasi polusi (seluruh rute null) tetap muncul terurut waktu dengan label null', () => {
    const routeNoPollutionA: RouteCandidate & { estimate: any } = {
      ...routeA,
      estimate: {
        exposureIndexPm25: null,
        avgPm25: null,
        category: null,
        coverageRatio: 0,
        confidenceLevel: 'unavailable',
        maxDataAgeMinutes: null,
        isPartiallyImputed: false,
        segments: [],
        topContributors: [],
        stationsUsed: [],
      },
    };

    const routeNoPollutionB: RouteCandidate & { estimate: any } = {
      ...routeB,
      estimate: {
        exposureIndexPm25: null,
        avgPm25: null,
        category: null,
        coverageRatio: 0,
        confidenceLevel: 'unavailable',
        maxDataAgeMinutes: null,
        isPartiallyImputed: false,
        segments: [],
        topContributors: [],
        stationsUsed: [],
      },
    };

    const decision = decideRoutes({
      routes: [routeNoPollutionA, routeNoPollutionB],
      preferences: { exposureWeight: 0.8, maxExtraTimePercent: 30 },
    });

    expect(decision.routes).toHaveLength(2);
    expect(decision.recommendedRouteLabel).toBeNull();
    expect(decision.explanation.reasonCode).toBe('NO_ESTIMATE');
    expect(decision.actionMessages[0].ruleId).toBe('RULE-07');
  });

  it('TC-32: Angka persentase dan menit di teks narasi rekomendasi identik 100% dengan metrik objek', () => {
    const decision = decideRoutes({
      routes: [routeA, routeB],
      preferences: { exposureWeight: 0.5, maxExtraTimePercent: 30 },
    });

    const exp = decision.explanation;
    expect(exp.reasonCode).toBe('BETTER_EXPOSURE');
    expect(exp.extraMinutes).toBe(3); // (1380 - 1200) / 60 = 3 menit
    expect(exp.extraPercent).toBe(15);
    expect(exp.exposureDeltaPercent).toBe(-15.7);

    // Teks narasi harus memuat angka yang sama persis
    expect(exp.text).toContain('15.7%');
    expect(exp.text).toContain('3 menit');
    expect(exp.text).toContain('+15%');
  });
});

describe('7. Mesin Aturan Rekomendasi Kesehatan (ALG-04, TC-13)', () => {
  it('TC-13: Rekomendasi maksimal 3 pesan, terurut prioritas keparahan, dan bebas klaim diagnosis klinis', () => {
    const analyzedRouteLongTrip: any = {
      id: 'r-long',
      label: 'A',
      distanceMeters: 25000,
      durationSeconds: 3600, // 60 menit (memenuhi RULE-04: trip panjang >= 45m)
      isFastest: true,
      comparison: { extraSeconds: 0, extraPercent: 0, exposureDeltaPercent: 0 },
      withinTimeLimit: true,
      isDominated: false,
      score: 1.0,
      estimate: {
        exposureIndexPm25: 3600,
        avgPm25: 60.0, // Kategori 'unhealthy' -> memicu RULE-03
        category: 'unhealthy',
        coverageRatio: 0.35, // Low confidence -> memicu RULE-06
        confidenceLevel: 'low',
        maxDataAgeMinutes: 60,
        isPartiallyImputed: true,
        segments: [],
        topContributors: [],
        stationsUsed: [],
      },
    };

    const messages = evaluateRecommendations({
      recommendedRoute: analyzedRouteLongTrip,
      fastestRoute: analyzedRouteLongTrip,
      allRoutes: [analyzedRouteLongTrip],
      now: new Date().toISOString(),
    });

    // Maksimal 3 pesan
    expect(messages.length).toBeLessThanOrEqual(3);

    // Terurut prioritas: warning (RULE-03) -> attention (RULE-04, RULE-06)
    expect(messages[0].severity).toBe('warning');
    expect(messages[0].ruleId).toBe('RULE-03');

    // Verifikasi redaksi bebas klaim diagnosis atau resep obat medis (PRD §9.7)
    for (const msg of messages) {
      const lower = msg.message.toLowerCase();
      expect(lower).not.toContain('resep');
      expect(lower).not.toContain('obat');
      expect(lower).not.toContain('dosis inhalasi');
      expect(lower).not.toContain('paru-paru rusak');
      expect(lower).not.toContain('kanker');
      expect(lower).not.toContain('asma kambuh');
    }
  });
});

