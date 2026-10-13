export type FreshnessStatus = 'fresh' | 'stale' | 'expired';

export type AirQualityCategory =
  | 'Baik'
  | 'Sedang'
  | 'Tidak Sehat bagi Sensitif'
  | 'Tidak Sehat'
  | 'Sangat Tidak Sehat'
  | 'Berbahaya';

export interface StationData {
  stationId: string;
  stationName: string;
  lat: number;
  lng: number;
  aqi: number | null;
  dominantPollutant: string | null;
  pm25Concentration: number | null; // µg/m³
  pm10Concentration: number | null; // µg/m³
  observedAt: string;              // ISO String (UTC)
  ageMinutes: number;
  freshness: FreshnessStatus;
  dataType: 'station_observation' | 'model_fallback' | 'simulation';
  sourceName: string;
}
