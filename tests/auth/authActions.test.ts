/**
 * @file authActions.test.ts
 * @description Unit tests untuk validasi otentikasi pengguna (AC-10.2).
 */

import { describe, it, expect, vi } from 'vitest';
import { validatePassword, signUpWithEmail, signInWithEmail } from '@/lib/client/auth/authActions';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signUp: vi.fn(async ({ email, password }) => {
        if (email.includes('error')) {
          return { data: { user: null }, error: { message: 'Database error' } };
        }
        return { data: { user: { id: 'mock-uuid', email } }, error: null };
      }),
      signInWithPassword: vi.fn(async ({ email, password }) => {
        if (password === 'WrongPass123') {
          return { data: { user: null }, error: { message: 'Invalid credentials' } };
        }
        return { data: { user: { id: 'mock-uuid', email } }, error: null };
      }),
      signOut: vi.fn(async () => ({ error: null })),
    },
  })),
}));

describe('Auth Actions & Validation (AC-10.2)', () => {
  describe('validatePassword', () => {
    it('menolak kata sandi kurang dari 8 karakter', () => {
      const result = validatePassword('Abc1');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('minimal terdiri dari 8 karakter');
    });

    it('menolak kata sandi tanpa angka', () => {
      const result = validatePassword('PasswordHanyaHuruf');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('kombinasi huruf dan angka');
    });

    it('menolak kata sandi hanya angka', () => {
      const result = validatePassword('1234567890');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('kombinasi huruf dan angka');
    });

    it('menerima kata sandi valid dengan huruf dan angka minimal 8 karakter', () => {
      const result = validatePassword('Aang2026!');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('menerima kata sandi alfanumerik biasa 8 karakter', () => {
      const result = validatePassword('rahasia8');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('signUpWithEmail', () => {
    it('gagal jika kata sandi tidak memenuhi kriteria', async () => {
      const res = await signUpWithEmail('test@example.com', 'short');
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('berhasil jika input valid', async () => {
      const res = await signUpWithEmail('test@example.com', 'ValidPass123');
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
    });
  });

  describe('signInWithEmail', () => {
    it('gagal jika email atau password kosong', async () => {
      const res = await signInWithEmail('', '');
      expect(res.success).toBe(false);
      expect(res.error).toContain('wajib diisi');
    });

    it('menghasilkan pesan generik jika gagal login', async () => {
      const res = await signInWithEmail('user@test.com', 'WrongPass123');
      expect(res.success).toBe(false);
      expect(res.error).toContain('tidak valid');
    });

    it('berhasil jika kredensial benar', async () => {
      const res = await signInWithEmail('user@test.com', 'CorrectPass123');
      expect(res.success).toBe(true);
    });
  });
});
