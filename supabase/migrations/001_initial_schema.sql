-- ==========================================================
-- Skema Database EcoPulse (Supabase PostgreSQL + RLS)
-- Pemilik: Person 3 (Database & Auth)
-- ==========================================================

-- 1. Tabel Profiles (Relasi 1:1 dengan auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  exposure_weight NUMERIC(3,2) NOT NULL DEFAULT 0.50 CHECK (exposure_weight >= 0 AND exposure_weight <= 1),
  max_extra_time_percent SMALLINT DEFAULT 30 CHECK (max_extra_time_percent >= 0 AND max_extra_time_percent <= 100),
  history_consent BOOLEAN NOT NULL DEFAULT FALSE,
  consent_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger untuk membuat profil secara otomatis saat pendaftaran user baru
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, exposure_weight, max_extra_time_percent, history_consent, created_at)
  VALUES (new.id, 0.50, 30, FALSE, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Tabel Trips (Snapshot Perjalanan & Estimasi Paparan)
CREATE TABLE IF NOT EXISTS public.trips (
  trip_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  origin_label TEXT NOT NULL,
  destination_label TEXT NOT NULL,
  origin_lat NUMERIC(9,6) NOT NULL CHECK (origin_lat >= -90 AND origin_lat <= 90),
  origin_lng NUMERIC(9,6) NOT NULL CHECK (origin_lng >= -180 AND origin_lng <= 180),
  destination_lat NUMERIC(9,6) NOT NULL CHECK (destination_lat >= -90 AND destination_lat <= 90),
  destination_lng NUMERIC(9,6) NOT NULL CHECK (destination_lng >= -180 AND destination_lng <= 180),
  route_polyline TEXT NOT NULL,
  distance_m INTEGER NOT NULL CHECK (distance_m > 0),
  duration_s INTEGER NOT NULL CHECK (duration_s > 0),
  analyzed_at TIMESTAMPTZ NOT NULL,
  exposure_index_pm25 NUMERIC,
  avg_pm25 NUMERIC,
  aqi_category TEXT,
  confidence_level TEXT NOT NULL CHECK (confidence_level IN ('high', 'medium', 'low', 'unavailable')),
  coverage_ratio NUMERIC(3,2) CHECK (coverage_ratio >= 0 AND coverage_ratio <= 1),
  data_source TEXT NOT NULL,
  fastest_duration_s INTEGER NOT NULL,
  fastest_exposure_index_pm25 NUMERIC,
  was_recommended BOOLEAN NOT NULL DEFAULT FALSE,
  used_exposure_weight NUMERIC(3,2) NOT NULL,
  estimate_details JSONB,
  algorithm_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indeks performa query riwayat per pengguna
CREATE INDEX IF NOT EXISTS idx_trips_user_created ON public.trips (user_id, created_at DESC);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================

-- Aktifkan RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Kebijakan RLS Profiles: Hanya bisa diakses & diubah oleh pemilik akun
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Kebijakan RLS Trips: Isolasi data perjalanan privat
CREATE POLICY "Users can view own trips"
  ON public.trips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trips"
  ON public.trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips"
  ON public.trips FOR DELETE
  USING (auth.uid() = user_id);
