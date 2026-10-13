export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
  meta: {
    timestamp: string;
    dataMode: 'live' | 'simulation';
    processingTimeMs?: number;
  };
}
