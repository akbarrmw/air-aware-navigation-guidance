/**
 * @file tripMapper.ts
 * @description Pemetaan dua arah antara Payload Perjalanan (klien, camelCase) dan Baris Database (Postgres, snake_case).
 * Mengintegrasikan encoding dan decoding polyline rute untuk efisiensi penyimpanan database.
 * 
 * @author Person 3 (Database, Auth, & History Services)
 * @module lib/trips/tripMapper
 * @see CODE_SPEC_AANG.md Bagian 3.6 & Bagian 8.1
 */

import type { TripSavePayload, TripListItem, TripDetail } from '@/types/trips';
import type { TripRow, TripInsertRow } from '@/types/database';
import type { AqiCategoryCode } from '@/types/aqiScale';
import type { RouteExposureEstimate } from '@/types/algorithms';
import { encodePolyline, decodePolyline } from './polyline';

/**
 * Mengubah TripSavePayload dari klien menjadi baris siap simpan ke PostgreSQL (TripInsertRow).
 * 
 * @param userId ID unik pengguna yang diautentikasi
 * @param payload Payload data perjalanan dari request klien
 * @returns TripInsertRow untuk di-insert ke tabel public.trips
 */
export function mapPayloadToRow(userId: string, payload: TripSavePayload): TripInsertRow {
  const route = payload.selectedRoute;
  const estimate = route.estimate;

  // Enkode koordinat geometri rute menjadi polyline terkompresi
  const routePolyline = encodePolyline(route.geometry.coordinates);

  const dataSourcesStr = payload.dataSources && payload.dataSources.length > 0
    ? payload.dataSources.map((ds) => ds.sourceName).join(', ')
    : 'simulated';

  // Simpan rincian estimasi segmen dan stasiun dalam kolom JSONB estimate_details
  const estimateDetails: Record<string, unknown> = {
    coverageRatio: estimate.coverageRatio,
    confidenceLevel: estimate.confidenceLevel,
    maxDataAgeMinutes: estimate.maxDataAgeMinutes,
    isPartiallyImputed: estimate.isPartiallyImputed,
    segments: estimate.segments,
    topContributors: estimate.topContributors,
    stationsUsed: estimate.stationsUsed,
    comparison: route.comparison,
  };

  return {
    user_id: userId,
    origin_label: payload.origin.label || `${payload.origin.lat.toFixed(4)}, ${payload.origin.lng.toFixed(4)}`,
    destination_label:
      payload.destination.label ||
      `${payload.destination.lat.toFixed(4)}, ${payload.destination.lng.toFixed(4)}`,
    origin_lat: payload.origin.lat,
    origin_lng: payload.origin.lng,
    destination_lat: payload.destination.lat,
    destination_lng: payload.destination.lng,
    route_polyline: routePolyline,
    distance_m: Math.round(route.distanceMeters),
    duration_s: Math.round(route.durationSeconds),
    analyzed_at: new Date().toISOString(),
    exposure_index_pm25: estimate.exposureIndexPm25,
    avg_pm25: estimate.avgPm25,
    aqi_category: estimate.category || null,
    confidence_level: estimate.confidenceLevel,
    coverage_ratio: estimate.coverageRatio,
    data_source: dataSourcesStr,
    fastest_duration_s: Math.round(payload.fastest.durationSeconds),
    fastest_exposure_index_pm25: payload.fastest.exposureIndexPm25,
    was_recommended: payload.wasRecommended,
    used_exposure_weight: payload.usedExposureWeight,
    estimate_details: estimateDetails,
    algorithm_version: payload.algorithmVersion || 'v1.0.0',
  };
}

/**
 * Mengubah satu baris database (TripRow) menjadi representasi ringkas untuk daftar riwayat (TripListItem).
 * 
 * @param row Baris data dari tabel public.trips
 * @returns TripListItem untuk kartu riwayat
 */
export function mapRowToListItem(row: TripRow): TripListItem {
  return {
    tripId: row.trip_id,
    originLabel: row.origin_label,
    destinationLabel: row.destination_label,
    analyzedAt: row.analyzed_at || row.created_at,
    distanceMeters: Number(row.distance_m),
    durationSeconds: Number(row.duration_s),
    exposureIndexPm25: row.exposure_index_pm25 !== null ? Number(row.exposure_index_pm25) : null,
    avgPm25: row.avg_pm25 !== null ? Number(row.avg_pm25) : null,
    category: (row.aqi_category as AqiCategoryCode) || null,
    confidenceLevel: row.confidence_level,
    wasRecommended: Boolean(row.was_recommended),
  };
}

/**
 * Mengubah baris database (TripRow) menjadi representasi rincian lengkap perjalanan (TripDetail).
 * Menguraikan kembali encoded polyline ke dalam array koordinat asli.
 * 
 * @param row Baris data dari tabel public.trips
 * @returns TripDetail lengkap untuk halaman rincian P-06
 */
export function mapRowToDetail(row: TripRow): TripDetail {
  const listItem = mapRowToListItem(row);
  const geometry = decodePolyline(row.route_polyline || '');

  // Ekstrak rincian estimasi dari kolom JSONB
  let estimate: RouteExposureEstimate | null = null;
  if (row.estimate_details) {
    const d = row.estimate_details as Record<string, unknown>;
    estimate = {
      exposureIndexPm25: row.exposure_index_pm25 !== null ? Number(row.exposure_index_pm25) : null,
      avgPm25: row.avg_pm25 !== null ? Number(row.avg_pm25) : null,
      category: (row.aqi_category as AqiCategoryCode) || null,
      coverageRatio: row.coverage_ratio !== null ? Number(row.coverage_ratio) : 0,
      confidenceLevel: row.confidence_level,
      maxDataAgeMinutes: (d.maxDataAgeMinutes as number | null) ?? null,
      isPartiallyImputed: Boolean(d.isPartiallyImputed),
      segments: Array.isArray(d.segments) ? (d.segments as RouteExposureEstimate['segments']) : [],
      topContributors: Array.isArray(d.topContributors)
        ? (d.topContributors as RouteExposureEstimate['topContributors'])
        : [],
      stationsUsed: Array.isArray(d.stationsUsed)
        ? (d.stationsUsed as RouteExposureEstimate['stationsUsed'])
        : [],
    };
  }

  return {
    ...listItem,
    origin: {
      lat: Number(row.origin_lat),
      lng: Number(row.origin_lng),
    },
    destination: {
      lat: Number(row.destination_lat),
      lng: Number(row.destination_lng),
    },
    geometry,
    coverageRatio: row.coverage_ratio !== null ? Number(row.coverage_ratio) : null,
    dataSource: row.data_source,
    fastest: {
      durationSeconds: Number(row.fastest_duration_s),
      exposureIndexPm25:
        row.fastest_exposure_index_pm25 !== null
          ? Number(row.fastest_exposure_index_pm25)
          : null,
    },
    usedExposureWeight: Number(row.used_exposure_weight),
    estimate,
    algorithmVersion: row.algorithm_version,
  };
}
