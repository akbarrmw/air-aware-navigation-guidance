/**
 * Modul aksi autentikasi pengguna (Sign Up, Sign In, Sign Out).
 */

import { createClient } from '@/lib/supabase/client';

export interface AuthActionResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: unknown;
}

/**
 * Memvalidasi kekuatan kata sandi pengguna.
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return {
      isValid: false,
      error: 'Kata sandi minimal terdiri dari 8 karakter.',
    };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    return {
      isValid: false,
      error: 'Kata sandi wajib memuat kombinasi huruf dan angka.',
    };
  }

  return { isValid: true };
}

/**
 * Mendaftarkan akun pengguna baru via email dan kata sandi.
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<AuthActionResult> {
  const pwdValidation = validatePassword(password);
  if (!pwdValidation.isValid) {
    return {
      success: false,
      error: pwdValidation.error,
    };
  }

  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });

  if (error) {
    return {
      success: false,
      error: error.message || 'Gagal mendaftarkan akun baru. Silakan coba lagi.',
    };
  }

  return {
    success: true,
    message: 'Pendaftaran akun berhasil.',
    data: data.user,
  };
}

/**
 * Masuk ke akun pengguna menggunakan email dan kata sandi.
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthActionResult> {
  if (!email || !password) {
    return {
      success: false,
      error: 'Email dan kata sandi wajib diisi.',
    };
  }

  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    // Pesan gagal login generik demi keamanan (AC-10.2)
    return {
      success: false,
      error: 'Email atau kata sandi yang Anda masukkan tidak valid.',
    };
  }

  return {
    success: true,
    message: 'Berhasil masuk ke akun.',
    data: data.user,
  };
}

/**
 * Keluar dari sesi akun saat ini.
 */
export async function signOut(): Promise<AuthActionResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return {
      success: false,
      error: error.message || 'Gagal keluar dari sesi.',
    };
  }

  return {
    success: true,
    message: 'Berhasil keluar.',
  };
}

/**
 * Mengambil data pengguna aktif saat ini.
 */
export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
