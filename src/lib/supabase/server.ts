/**
 * @file server.ts
 * @description Klien Supabase sisi server dengan pengelolaan cookie SSR (Next.js 16.4.0 App Router).
 * Digunakan pada Server Components, Server Actions, dan Route Handlers.
 * 
 * @author Person 3 (Database, Auth, & History Services)
 * @module lib/supabase/server
 * @see CODE_SPEC_AANG.md Bagian 8.1
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key';

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Dipanggil dari Server Component; sesi disegarkan oleh middleware
        }
      },
    },
  });
}

// Alias fungsi untuk konsistensi panggilan
export const createServerClientInstance = createServerSupabaseClient;
