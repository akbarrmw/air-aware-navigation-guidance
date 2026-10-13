export interface ProfileRecord {
  user_id: string;
  exposure_weight: number;
  max_extra_time_percent: number | null;
  history_consent: boolean;
  consent_updated_at: string | null;
  created_at: string;
}

export interface TripRecord {
  trip_id: string;
  user_id: string;
  origin_label: string;
  destination_label: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  route_polyline: string;
  distance_m: number;
  duration_s: number;
  analyzed_at: string;
  exposure_index_pm25: number | null;
  avg_pm25: number | null;
  aqi_category: string | null;
  confidence_level: 'high' | 'medium' | 'low' | 'unavailable';
  coverage_ratio: number | null;
  data_source: string;
  fastest_duration_s: number;
  fastest_exposure_index_pm25: number | null;
  was_recommended: boolean;
  used_exposure_weight: number;
  estimate_details: Record<string, unknown> | null;
  algorithm_version: string;
  created_at: string;
}
