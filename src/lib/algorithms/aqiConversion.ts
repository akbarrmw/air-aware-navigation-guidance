import { AirQualityCategory } from '@/types/air-quality';

/**
 * Breakpoint US-EPA untuk PM2.5 (µg/m³ vs AQI)
 */
const EPA_PM25_BREAKPOINTS = [
  { cLow: 0.0, cHigh: 12.0, iLow: 0, iHigh: 50, category: 'Baik' as AirQualityCategory },
  { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100, category: 'Sedang' as AirQualityCategory },
  { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150, category: 'Tidak Sehat bagi Sensitif' as AirQualityCategory },
  { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200, category: 'Tidak Sehat' as AirQualityCategory },
  { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300, category: 'Sangat Tidak Sehat' as AirQualityCategory },
  { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500, category: 'Berbahaya' as AirQualityCategory },
];

/**
 * Mengonversi nilai AQI menjadi estimasi konsentrasi PM2.5 (µg/m³)
 * Menggunakan interpolasi terbalik dari breakpoint EPA.
 */
export function aqiToPm25Concentration(aqi: number | null): number | null {
  if (aqi === null || aqi < 0) return null;
  const clampedAqi = Math.min(aqi, 500);

  const bp = EPA_PM25_BREAKPOINTS.find((b) => clampedAqi >= b.iLow && clampedAqi <= b.iHigh);
  if (!bp) return null;

  // Rumus interpolasi terbalik AQI -> C
  const concentration = ((clampedAqi - bp.iLow) / (bp.iHigh - bp.iLow)) * (bp.cHigh - bp.cLow) + bp.cLow;
  return Number(concentration.toFixed(1));
}

/**
 * Mendapatkan kategori kualitas udara berdasarkan konsentrasi PM2.5 (µg/m³)
 */
export function pm25ToCategory(pm25: number | null): AirQualityCategory | 'Tidak Tersedia' {
  if (pm25 === null) return 'Tidak Tersedia';
  const clamped = Math.min(Math.max(pm25, 0), 500.4);
  const bp = EPA_PM25_BREAKPOINTS.find((b) => clamped >= b.cLow && clamped <= b.cHigh);
  return bp ? bp.category : 'Berbahaya';
}
