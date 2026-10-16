import { StationData, FreshnessStatus } from '@/types/air-quality';
import { aqiToPm25Concentration } from '@/lib/algorithms/aqiConversion';

export interface RawStationInput {
  stationId: string;
  stationName?: string | null;
  lat: number;
  lng: number;
  aqi?: number | null;
  dominantPollutant?: string | null;
  pm25Concentration?: number | null;
  pm10Concentration?: number | null;
  observedAt?: string | null;
  dataType?: 'station_observation' | 'model_fallback' | 'simulation';
  sourceName?: string | null;
}

/**
 * Menghitung usia data dalam menit dan menentukan status kesegaran (freshness).
 */
export function calculateFreshness(observedAtIso: string | null | undefined): {
  ageMinutes: number;
  freshness: FreshnessStatus;
  utcIso: string;
} {
  if (!observedAtIso) {
    return {
      ageMinutes: 99999,
      freshness: 'expired',
      utcIso: new Date(0).toISOString(),
    };
  }

  const date = new Date(observedAtIso);
  if (isNaN(date.getTime())) {
    return {
      ageMinutes: 99999,
      freshness: 'expired',
      utcIso: new Date(0).toISOString(),
    };
  }

  const now = Date.now();
  const diffMs = Math.max(0, now - date.getTime());
  const ageMinutes = Math.floor(diffMs / (1000 * 60));

  let freshness: FreshnessStatus = 'expired';
  if (ageMinutes <= 180) {
    freshness = 'fresh';
  } else if (ageMinutes <= 1440) {
    freshness = 'stale';
  }

  return {
    ageMinutes,
    freshness,
    utcIso: date.toISOString(),
  };
}

/**
 * Menormalisasi raw station data menjadi format standar StationData.
 */
export function normalizeStation(raw: RawStationInput): StationData {
  const { ageMinutes, freshness, utcIso } = calculateFreshness(raw.observedAt);

  let pm25 = raw.pm25Concentration ?? null;
  let pm25Origin: 'measured' | 'derivedFromAqi' | null = null;

  if (pm25 !== null) {
    pm25Origin = 'measured';
  } else if (typeof raw.aqi === 'number') {
    pm25 = aqiToPm25Concentration(raw.aqi);
    if (pm25 !== null) {
      pm25Origin = 'derivedFromAqi';
    }
  }

  return {
    stationId: String(raw.stationId),
    stationName: raw.stationName || 'Stasiun Pemantau Kualitas Udara',
    lat: Number(raw.lat),
    lng: Number(raw.lng),
    aqi: typeof raw.aqi === 'number' ? raw.aqi : null,
    dominantPollutant: raw.dominantPollutant ?? (pm25 !== null ? 'pm25' : null),
    pm25Concentration: pm25,
    pm25Origin,
    pm10Concentration: raw.pm10Concentration ?? null,
    observedAt: utcIso,
    ageMinutes,
    freshness,
    dataType: raw.dataType || 'station_observation',
    sourceName: raw.sourceName || 'WAQI',
  };
}
