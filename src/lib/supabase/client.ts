/**
 * @file client.ts
 * @description Klien Supabase sisi peramban (browser) menggunakan @supabase/ssr.
 * @author Person 3 (Database, Auth, & History Services)
 * @module lib/supabase/client
 * @see CODE_SPEC_AANG.md Bagian 8.1
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key';

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
