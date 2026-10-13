import { NextResponse } from 'next/server';
import { ApiResponse } from '@/types/api';

export function createSuccessResponse<T>(data: T, processingTimeMs?: number) {
  const isSimulation = process.env.DATA_MODE === 'simulation';
  const response: ApiResponse<T> = {
    success: true,
    data,
    error: null,
    meta: {
      timestamp: new Date().toISOString(),
      dataMode: isSimulation ? 'simulation' : 'live',
      processingTimeMs,
    },
  };
  return NextResponse.json(response);
}

export function createErrorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: unknown
) {
  const isSimulation = process.env.DATA_MODE === 'simulation';
  const response: ApiResponse<null> = {
    success: false,
    data: null,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      dataMode: isSimulation ? 'simulation' : 'live',
    },
  };
  return NextResponse.json(response, { status });
}
