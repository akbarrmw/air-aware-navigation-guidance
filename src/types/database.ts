/**
 * @file database.ts
 * @description Tipe data baris tabel database Supabase PostgreSQL (profiles & trips).
 * Digunakan internal oleh Person 3 (Database, Auth, dan Riwayat Perjalanan).
 * 
 * @author Person 3 (Database, Auth & History Services)
 * @module types/database
 * @see CODE_SPEC_AANG.md Bagian 4 & Bagian 8.1
 */

import type { ConfidenceLevel } from './algorithms';

/**
 * Representasi baris pada tabel `public.profiles`.
 */
export interface ProfileRow {
  user_id: string;
  exposure_weight: number;
  max_extra_time_percent: number | null;
  history_consent: boolean;
  consent_updated_at: string | null;
  created_at: string;
}

/**
 * Representasi payload update pada tabel `public.profiles`.
 */
export interface ProfileUpdatePayload {
  exposure_weight?: number;
  max_extra_time_percent?: number | null;
  history_consent?: boolean;
  consent_updated_at?: string;
}

/**
 * Representasi baris pada tabel `public.trips`.
 */
export interface TripRow {
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
  confidence_level: ConfidenceLevel;
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

/**
 * Representasi baris masukan baru (insert) pada tabel `public.trips`.
 */
export type TripInsertRow = Omit<TripRow, 'trip_id' | 'created_at'> & {
  trip_id?: string;
  created_at?: string;
};

/**
 * Definisi skema Database Supabase untuk generic type-safety klien Supabase.
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Omit<ProfileRow, 'created_at'> & { created_at?: string };
        Update: Partial<ProfileUpdatePayload>;
      };
      trips: {
        Row: TripRow;
        Insert: TripInsertRow;
        Update: Partial<TripRow>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

// Alias untuk kompatibilitas ke belakang
export type ProfileRecord = ProfileRow;
export type TripRecord = TripRow;
