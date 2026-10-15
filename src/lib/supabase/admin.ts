/**
 * @file admin.ts
 * @description Klien administratif Supabase menggunakan Service Role Key (SERVER-ONLY).
 * Digunakan secara eksklusif untuk operasi tingkat tinggi seperti penghapusan akun permanen (DELETE auth.users).
 * 
 * PERINGATAN KEAMANAN:
 * Berkas ini tidak boleh diimpor oleh komponen peramban / client.
 * 
 * @author Person 3 (Database, Auth, & History Services)
 * @module lib/supabase/admin
 * @see CODE_SPEC_AANG.md Bagian 4.3 & Bagian 8.1
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    console.warn(
      '[Supabase Admin] Peringatan: SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi. Operasi administratif akan gagal.'
    );
  }

  return createClient<Database>(
    supabaseUrl,
    serviceRoleKey || 'mock-service-role-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
