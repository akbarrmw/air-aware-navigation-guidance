/**
 * @file accountSettings.test.ts
 * @description Unit tests untuk validasi skema preferensi, konsensus privasi, dan penghapusan akun (TC-23).
 */

import { describe, it, expect } from 'vitest';
import {
  PreferencesPayloadSchema,
  ConsentPayloadSchema,
  DeleteAccountPayloadSchema,
  RoutePreferencesSchema,
} from '@/types/schemas';

describe('Account & Preferences Schemas (FR-12 & TC-23)', () => {
  describe('RoutePreferencesSchema', () => {
    it('menerima bobot preferensi valid (0 s/d 1)', () => {
      const parsed = RoutePreferencesSchema.safeParse({
        exposureWeight: 0.75,
        maxExtraTimePercent: 25,
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.exposureWeight).toBe(0.75);
        expect(parsed.data.maxExtraTimePercent).toBe(25);
      }
    });

    it('mengizinkan maxExtraTimePercent bernilai null (unlimited time)', () => {
      const parsed = RoutePreferencesSchema.safeParse({
        exposureWeight: 0.5,
        maxExtraTimePercent: null,
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.maxExtraTimePercent).toBeNull();
      }
    });

    it('menolak bobot eksposur di luar rentang 0-1', () => {
      const under = RoutePreferencesSchema.safeParse({ exposureWeight: -0.1 });
      expect(under.success).toBe(false);

      const over = RoutePreferencesSchema.safeParse({ exposureWeight: 1.2 });
      expect(over.success).toBe(false);
    });

    it('menolak maxExtraTimePercent negatif atau > 100', () => {
      const neg = RoutePreferencesSchema.safeParse({ maxExtraTimePercent: -10 });
      expect(neg.success).toBe(false);

      const over = RoutePreferencesSchema.safeParse({ maxExtraTimePercent: 120 });
      expect(over.success).toBe(false);
    });
  });

  describe('ConsentPayloadSchema', () => {
    it('menerima nilai boolean true/false untuk persetujuan riwayat', () => {
      const okTrue = ConsentPayloadSchema.safeParse({ historyConsent: true });
      expect(okTrue.success).toBe(true);

      const okFalse = ConsentPayloadSchema.safeParse({ historyConsent: false });
      expect(okFalse.success).toBe(true);
    });

    it('menolak jika historyConsent bukan tipe boolean', () => {
      const bad = ConsentPayloadSchema.safeParse({ historyConsent: 'yes' });
      expect(bad.success).toBe(false);
    });
  });

  describe('PreferencesPayloadSchema', () => {
    it('menerima payload kombinasi preferensi rute dan status konsensus', () => {
      const valid = PreferencesPayloadSchema.safeParse({
        exposureWeight: 0.8,
        maxExtraTimePercent: 15,
        historyConsent: true,
      });
      expect(valid.success).toBe(true);
    });

    it('menolak jika historyConsent tidak disertakan', () => {
      const missing = PreferencesPayloadSchema.safeParse({
        exposureWeight: 0.5,
        maxExtraTimePercent: 30,
      });
      expect(missing.success).toBe(false);
    });
  });

  describe('DeleteAccountPayloadSchema (TC-23)', () => {
    it('menerima payload berisi kata sandi verifikasi', () => {
      const valid = DeleteAccountPayloadSchema.safeParse({ password: 'SecretPassword123' });
      expect(valid.success).toBe(true);
    });

    it('menolak jika kata sandi kosong', () => {
      const empty = DeleteAccountPayloadSchema.safeParse({ password: '' });
      expect(empty.success).toBe(false);
    });
  });
});
