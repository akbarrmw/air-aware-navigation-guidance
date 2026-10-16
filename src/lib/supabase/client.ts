import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/**
 * Inisialisasi klien Supabase untuk browser.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key';

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
