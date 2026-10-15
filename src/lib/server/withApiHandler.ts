/**
 * @file withApiHandler.ts
 * @description Wrapper tingkat tinggi (Higher-Order Function) untuk handler Next.js API Routes.
 * Menjamin standardisasi validasi input, logging error, pengukuran performa (processingTimeMs),
 * dan enkapsulasi respons dalam amplop ApiResponse<T>.
 * 
 * @author Person 1 (Core Algorithm & System Integration)
 * @module lib/server/withApiHandler
 * @see CODE_SPEC_AANG.md Bagian 6 & 11 (FROZEN CORE)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodError, type ZodSchema } from 'zod';
import type { ApiResponse, ErrorCode } from '@/types/api';
import { sendError, sendSuccess, type ApiResponseOptions } from './apiResponse';

/**
 * Kelas error khusus untuk memicu respons galat API terstruktur dari dalam handler.
 */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Konfigurasi opsi untuk wrapper handler API.
 */
export interface ApiHandlerConfig<TBody = unknown, TQuery = unknown> {
  /** Skema validasi Zod untuk JSON request body (opsional) */
  bodySchema?: ZodSchema<TBody>;
  /** Skema validasi Zod untuk URL searchParams (opsional) */
  querySchema?: ZodSchema<TQuery>;
}

/**
 * Konteks yang disalurkan ke fungsi handler bisnis.
 */
export interface HandlerContext<TBody = unknown, TQuery = unknown> {
  /** Objek NextRequest asli */
  req: NextRequest;
  /** Data body yang telah lolos validasi Zod */
  body: TBody;
  /** Data query parameter yang telah lolos validasi Zod */
  query: TQuery;
  /** Next.js Route params (misal: [id]) jika ada */
  params?: Record<string, string | string[]>;
}

/**
 * Tipe fungsi handler inti yang ditulis oleh developer (P2, P3).
 */
export type CoreHandler<TResponse, TBody = unknown, TQuery = unknown> = (
  ctx: HandlerContext<TBody, TQuery>
) => Promise<TResponse | { data: TResponse; options?: ApiResponseOptions; status?: number }>;

/**
 * Membungkus handler endpoint API Next.js dengan penanganan error, validasi otomatis,
 * dan pembentukan amplop ApiResponse seragam.
 * 
 * @template TResponse Tipe data payload yang dihasilkan handler
 * @template TBody Tipe input body yang diharapkan
 * @template TQuery Tipe input query yang diharapkan
 * 
 * @param handler Fungsi logika bisnis endpoint
 * @param config Konfigurasi skema validasi opsional
 * @returns Standard Next.js route handler function
 * 
 * @example
 * ```ts
 * export const POST = withApiHandler(
 *   async ({ body }) => {
 *     const result = await processRouteAnalysis(body);
 *     return result;
 *   },
 *   { bodySchema: AnalyzeRoutesRequestSchema }
 * );
 * ```
 */
export function withApiHandler<TResponse, TBody = unknown, TQuery = unknown>(
  handler: CoreHandler<TResponse, TBody, TQuery>,
  config: ApiHandlerConfig<TBody, TQuery> = {}
) {
  return async (
    req: NextRequest,
    routeContext?: { params?: Promise<Record<string, string | string[]>> }
  ): Promise<NextResponse<ApiResponse<TResponse | null>>> => {
    const startTime = performance.now();

    try {
      // 1. Ekstraksi params jika ada
      const resolvedParams = routeContext?.params ? await routeContext.params : undefined;

      // 2. Validasi Query Parameters jika skema didefinisikan
      let validatedQuery = {} as TQuery;
      if (config.querySchema) {
        const searchParamsObj = Object.fromEntries(req.nextUrl.searchParams.entries());
        const queryParsed = config.querySchema.safeParse(searchParamsObj);
        if (!queryParsed.success) {
          const elapsed = Math.round(performance.now() - startTime);
          return sendError(
            'VALIDATION_ERROR',
            'Parameter query tidak valid',
            queryParsed.error.flatten().fieldErrors,
            { processingTimeMs: elapsed }
          );
        }
        validatedQuery = queryParsed.data;
      }

      // 3. Validasi JSON Request Body jika skema didefinisikan
      let validatedBody = {} as TBody;
      if (config.bodySchema) {
        let rawBody: unknown;
        try {
          rawBody = await req.json();
        } catch {
          const elapsed = Math.round(performance.now() - startTime);
          return sendError(
            'VALIDATION_ERROR',
            'Format JSON body tidak valid atau kosong',
            undefined,
            { processingTimeMs: elapsed }
          );
        }

        const bodyParsed = config.bodySchema.safeParse(rawBody);
        if (!bodyParsed.success) {
          const elapsed = Math.round(performance.now() - startTime);
          return sendError(
            'VALIDATION_ERROR',
            'Validasi data input gagal',
            bodyParsed.error.flatten().fieldErrors,
            { processingTimeMs: elapsed }
          );
        }
        validatedBody = bodyParsed.data;
      }

      // 4. Eksekusi logika handler inti
      const result = await handler({
        req,
        body: validatedBody,
        query: validatedQuery,
        params: resolvedParams,
      });

      const elapsed = Math.round(performance.now() - startTime);

      // Cek apakah handler mengembalikan objek custom { data, options, status }
      if (
        result !== null &&
        typeof result === 'object' &&
        'data' in result &&
        ('options' in result || 'status' in result)
      ) {
        const customResult = result as {
          data: TResponse;
          options?: ApiResponseOptions;
          status?: number;
        };
        return sendSuccess(
          customResult.data,
          { processingTimeMs: elapsed, ...customResult.options },
          customResult.status ?? 200
        );
      }

      return sendSuccess(result as TResponse, { processingTimeMs: elapsed });
    } catch (err: unknown) {
      const elapsed = Math.round(performance.now() - startTime);

      // Penanganan AppError terencana
      if (err instanceof AppError) {
        return sendError(
          err.code,
          err.message,
          err.details,
          { processingTimeMs: elapsed },
          err.statusCode
        );
      }

      // Penanganan ZodError langsung bila dilempar manual
      if (err instanceof ZodError) {
        return sendError(
          'VALIDATION_ERROR',
          'Validasi input gagal',
          err.flatten().fieldErrors,
          { processingTimeMs: elapsed }
        );
      }

      // Log galat internal yang tidak tertangani
      console.error('[API_INTERNAL_ERROR]', err);

      const errorMessage =
        process.env.NODE_ENV === 'development' && err instanceof Error
          ? err.message
          : 'Terjadi kesalahan internal pada server';

      return sendError(
        'INTERNAL_ERROR',
        errorMessage,
        undefined,
        { processingTimeMs: elapsed },
        500
      );
    }
  };
}
