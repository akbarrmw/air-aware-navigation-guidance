/**
 * @file authActions.ts
 * @description Modul aksi autentikasi pengguna Supabase Auth (Sign Up, Sign In, Sign Out).
 * Mematuhi kriteria kata sandi >= 8 karakter kombinasi huruf dan angka (AC-10.2).
 * 
 * @author Person 3 (Database, Auth, & History Services)
 * @module lib/client/auth/authActions
 * @see CODE_SPEC_AANG.md Bagian 8.1, AC-10.2, ASM-09
 */

import { createClient } from '@/lib/supabase/client';

export interface AuthActionResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: unknown;
}

/**
 * Validasi kekuatan kata sandi sesuai spesifikasi AC-10.2:
 * - Minimal 8 karakter
 * - Wajib mengandung kombinasi huruf dan angka
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
 * Mendaftarkan akun pengguna baru via Supabase Auth (Email + Password).
 * Konfirmasi email dinonaktifkan untuk kemudahan hackathon (ASM-09).
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
 * Masuk ke akun pengguna menggunakan Email dan Password.
 * Menghasilkan pesan kesalahan generik jika otentikasi gagal untuk keamanan (AC-10.2).
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
 * Keluar dari sesi akun saat ini (Sign Out).
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
