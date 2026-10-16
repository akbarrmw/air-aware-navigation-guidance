-- ==========================================================
-- Migration 002: Menambahkan kolom transport_mode ke tabel public.trips
-- Supabase PostgreSQL
-- ==========================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'trips' 
      AND column_name = 'transport_mode'
  ) THEN
    ALTER TABLE public.trips 
    ADD COLUMN transport_mode TEXT NOT NULL DEFAULT 'car' 
    CHECK (transport_mode IN ('car', 'motorcycle', 'walk'));
  END IF;
END $$;
