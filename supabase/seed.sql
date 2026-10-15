-- ==========================================================
-- Data Seed Contoh Opsional untuk Demo / Pengujian Lokal
-- Supabase AANG (Air-Aware Navigation Guidance)
-- Pemilik: Person 3 (Database & Auth)
-- ==========================================================

-- Catatan: Data auth.users harus dibuat melalui API Supabase Auth.
-- File seed ini menyediakan contoh struktur catatan perjalanan jika diperlukan pengujian langsung pada SQL Editor.

-- Contoh penambahan profil manual (hanya untuk user yang sudah terdaftar di auth.users)
-- INSERT INTO public.profiles (user_id, exposure_weight, max_extra_time_percent, history_consent)
-- VALUES ('00000000-0000-0000-0000-000000000001', 0.50, 30, true)
-- ON CONFLICT (user_id) DO UPDATE SET history_consent = EXCLUDED.history_consent;
