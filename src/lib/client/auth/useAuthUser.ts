/**
 * @file useAuthUser.ts
 * @description Hook React untuk memantau status login dan profil pengguna secara real-time.
 * @author Person 3 (Database, Auth, & History Services)
 * @module lib/client/auth/useAuthUser
 * @see CODE_SPEC_AANG.md Bagian 8.1 & FR-10
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { ProfileRow } from '@/types/database';

export interface UseAuthUserResult {
  user: User | null;
  profile: ProfileRow | null;
  loading: boolean;
  isAuthenticated: boolean;
  refetchProfile: () => Promise<void>;
}

export function useAuthUser(): UseAuthUserResult {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        setProfile(data as ProfileRow);
      }
    } catch (err) {
      console.error('[useAuthUser] Gagal mengambil profil:', err);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // 1. Ambil sesi awal
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetchProfile(user.id).finally(() => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // 2. Berlangganan perubahan status autentikasi
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const refetchProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  return {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    refetchProfile,
  };
}
