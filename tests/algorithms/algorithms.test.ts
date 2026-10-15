/**
 * @file algorithms.test.ts
 * @description Unit tests untuk modul algoritma dasar AANG (Person 1).
 * @see CODE_SPEC_AANG.md Bagian 14 (TC-06)
 */

import { describe, it, expect } from 'vitest';
import {
  aqiToPm25,
  aqiToPm25Concentration,
  pm25ToCategory,
  pm25ToCategoryLabel,
  AQI_BREAKPOINT_VERSION,
} from '@/lib/algorithms/aqiConversion';
import { calculateDistanceMeters } from '@/lib/algorithms/interpolation';

describe('Person 1 - Algoritma Dasar', () => {
  it('TC-06: Mengonversi AQI 50 menjadi konsentrasi batas 12 µg/m³ dan kategori good/Baik', () => {
    const pm25 = aqiToPm25(50);
    expect(pm25).toBe(12.0);
    expect(pm25ToCategory(pm25)).toBe('good');
    expect(pm25ToCategoryLabel(pm25)).toBe('Baik');
  });

  it('TC-06: Mengonversi AQI 100 menjadi konsentrasi 35.4 µg/m³ dan kategori moderate/Sedang', () => {
    const pm25 = aqiToPm25Concentration(100);
    expect(pm25).toBe(35.4);
    expect(pm25ToCategory(pm25)).toBe('moderate');
    expect(pm25ToCategoryLabel(pm25)).toBe('Sedang');
  });

  it('TC-06: Menangani edge cases nilai invalid (null, negatif, clamp > 500)', () => {
    expect(aqiToPm25(null)).toBeNull();
    expect(aqiToPm25(-10)).toBeNull();
    expect(aqiToPm25(600)).toBe(500.4);
    expect(pm25ToCategory(null)).toBeNull();
    expect(AQI_BREAKPOINT_VERSION).toBe('US-EPA-2024');
  });

  it('Jarak Haversine antar titik yang sama adalah 0 meter', () => {
    const dist = calculateDistanceMeters(-6.99, 110.42, -6.99, 110.42);
    expect(dist).toBe(0);
  });
});
