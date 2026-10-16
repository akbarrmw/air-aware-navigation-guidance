import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Inisialisasi klien administratif Supabase menggunakan Service Role Key (server-only).
 */
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
