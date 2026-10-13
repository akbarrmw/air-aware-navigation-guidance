import { describe, it, expect } from 'vitest';
import { aqiToPm25Concentration, pm25ToCategory } from '@/lib/algorithms/aqiConversion';
import { calculateDistanceMeters } from '@/lib/algorithms/interpolation';

describe('Person 1 - Algoritma Dasar', () => {
  it('TC-06: Mengonversi AQI 50 menjadi konsentrasi batas 12 µg/m³', () => {
    const pm25 = aqiToPm25Concentration(50);
    expect(pm25).toBe(12.0);
    expect(pm25ToCategory(pm25)).toBe('Baik');
  });

  it('TC-06: Mengonversi AQI 100 menjadi konsentrasi 35.4 µg/m³', () => {
    const pm25 = aqiToPm25Concentration(100);
    expect(pm25).toBe(35.4);
    expect(pm25ToCategory(pm25)).toBe('Sedang');
  });

  it('Jarak Haversine antar titik yang sama adalah 0 meter', () => {
    const dist = calculateDistanceMeters(-6.99, 110.42, -6.99, 110.42);
    expect(dist).toBe(0);
  });
});
