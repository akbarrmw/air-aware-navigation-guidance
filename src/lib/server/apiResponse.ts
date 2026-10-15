/**
 * @file apiResponse.ts
 * @description Helper pembentuk amplop standar ApiResponse<T> dan pemetaan status kode HTTP.
 * @author Person 1 (Core Algorithm & System Integration)
 * @module lib/server/apiResponse
 * @see CODE_SPEC_AANG.md Bagian 3.2 & NFR-13
 */

import { NextResponse } from 'next/server';
import type { ApiResponse, ApiError, ApiMeta, ErrorCode } from '@/types/api';
import type { DataMode } from '@/types/common';

/**
 * Pemetaan resmi dari ErrorCode sistem ke HTTP Status Code standar.
 */
export const ERROR_HTTP_STATUS_MAP: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  CONSENT_REQUIRED: 403,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  NO_ROUTE_FOUND: 404,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  UPSTREAM_ERROR: 502,
  UPSTREAM_TIMEOUT: 504,
};

/**
 * Opsi tambahan saat membentuk metadata respons.
 */
export interface ApiResponseOptions {
  /** Mode data yang sedang aktif (live atau simulation) */
  dataMode?: DataMode;
  /** Waktu proses kalkulasi dalam milidetik */
  processingTimeMs?: number;
  /** Halaman saat ini untuk query dengan pagination */
  page?: number;
  /** Ukuran halaman untuk query dengan pagination */
  pageSize?: number;
  /** Total keseluruhan data */
  total?: number;
}

/**
 * Membentuk objek metadata standar respons API.
 * 
 * @param options Konfigurasi metadata opsional
 * @returns Objek ApiMeta dengan waktu ISO UTC saat ini
 */
export function createApiMeta(options: ApiResponseOptions = {}): ApiMeta {
  const currentMode =
    options.dataMode ??
    (process.env.DATA_MODE === 'simulation' ? 'simulation' : 'live');

  const meta: ApiMeta = {
    timestamp: new Date().toISOString(),
    dataMode: currentMode,
  };

  if (typeof options.processingTimeMs === 'number') {
    meta.processingTimeMs = options.processingTimeMs;
  }

  if (typeof options.page === 'number') meta.page = options.page;
  if (typeof options.pageSize === 'number') meta.pageSize = options.pageSize;
  if (typeof options.total === 'number') meta.total = options.total;

  return meta;
}

/**
 * Membuat NextResponse sukses berisi data dengan format amplop ApiResponse<T>.
 * 
 * @template T Tipe payload data
 * @param data Objek data payload
 * @param options Opsi metadata (dataMode, processingTime, dsb.)
 * @param status Kode status HTTP (default: 200)
 * @returns NextResponse dengan body ApiResponse<T>
 * 
 * @example
 * ```ts
 * return sendSuccess(payload, { processingTimeMs: 45 });
 * ```
 */
export function sendSuccess<T>(
  data: T,
  options: ApiResponseOptions = {},
  status = 200
): NextResponse<ApiResponse<T>> {
  const body: ApiResponse<T> = {
    success: true,
    data,
    error: null,
    meta: createApiMeta(options),
  };

  return NextResponse.json(body, { status });
}

/**
 * Membuat NextResponse galat dengan format amplop ApiResponse<null>.
 * 
 * @param code Kode galat standar (ErrorCode)
 * @param message Pesan penjelasan penyebab galat
 * @param details Rincian galat tambahan (misal: issues validasi Zod)
 * @param options Opsi metadata
 * @param customStatus Override kode status HTTP (opsional)
 * @returns NextResponse dengan body ApiResponse<null>
 * 
 * @example
 * ```ts
 * return sendError('VALIDATION_ERROR', 'Input koordinat tidak valid', zodErrors);
 * ```
 */
export function sendError(
  code: ErrorCode,
  message: string,
  details?: unknown,
  options: ApiResponseOptions = {},
  customStatus?: number
): NextResponse<ApiResponse<null>> {
  const status = customStatus ?? ERROR_HTTP_STATUS_MAP[code] ?? 500;

  const errorObj: ApiError = {
    code,
    message,
    ...(details !== undefined ? { details } : {}),
  };

  const body: ApiResponse<null> = {
    success: false,
    data: null,
    error: errorObj,
    meta: createApiMeta(options),
  };

  return NextResponse.json(body, { status });
}
