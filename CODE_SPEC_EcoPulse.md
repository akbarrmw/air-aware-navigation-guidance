# Code Specification — EcoPulse (Hackathon Architecture)

Dokumen ini adalah spesifikasi teknis implementasi (*Code Specification*) untuk **EcoPulse**, diturunkan langsung dari `PRD_EcoPulse_Hackathon.md`. 
Tujuan utama spesifikasi ini:
1. **Meminimalisasi Merge Conflict ke tingkat nol (Zero Merge Conflict Architecture)** melalui pemisahan domain folder, *contract-first development*, dan isolasi dependensi.
2. **Membagi tugas secara tegas untuk 4 orang** dengan batasan kepemilikan file yang jelas.
3. **Menyediakan daftar konfirmasi wajib** di tiap bagian tugas guna memitigasi risiko sebelum koding dimulai.

---

## 1. Arsitektur Anti-Merge Conflict (Prinsip & Standar)

### 1.1 Prinsip Desain
1. **Contract-First (Kunci Tipe di Awal):** File `src/types/` didefinisikan dan disepakati pada **Hari 1 Jam ke-2**. Setelah disepakati, file tipe berstatus *FROZEN* (hanya boleh diubah melalui diskusi pleno 4 orang).
2. **Strict File Ownership:** Setiap anggota tim memiliki direktori khusus. Anggota dilarang mengedit file di luar direktorinya.
3. **No Central Barrel Conflicts:** Hindari file `index.ts` raksasa yang mengekspor segalanya. Setiap modul diimpor langsung dari jalurnya (contoh: `import { calculateExposure } from '@/lib/algorithms/exposure'`).
4. **Independent Mocking:** Frontend (Anggota 4) dan Backend Auth (Anggota 3) tidak menunggu kalkulasi algoritma (Anggota 1) atau API eksternal (Anggota 2). Semua bekerja memakai contract fixtures di `src/fixtures/`.
5. **Pure Functions vs Side-Effects:** Seluruh logika matematika/optimasi tidak mengenal browser atau database; murni fungsi JavaScript/TypeScript standar.

### 1.2 Tech Stack Standar
- **Framework:** Next.js 14+ (App Router, TypeScript)
- **Database & Auth:** Supabase (PostgreSQL + RLS + Supabase Auth)
- **Map Engine:** Leaflet + React-Leaflet (dynamic client-only import)
- **Validasi Data:** Zod
- **Testing:** Vitest / Jest (Unit tests tanpa perlu mock jaringan untuk algoritma)
- **Styling:** Tailwind CSS / CSS Modules dengan variabel warna global terpusat di `globals.css`

---

## 2. Struktur Folder & Matriks Kepemilikan File

```
air-aware-navigation-guidance/
├── .env.example                       # [Shared - Inisialisasi awal bersama]
├── package.json                       # [Shared - Dipasang dependensi di awal oleh Person 2]
├── tsconfig.json                      # [Shared - Frozen]
├── supabase/                          # =============================
│   ├── migrations/                    # [OWNER: PERSON 3]
│   │   └── 001_initial_schema.sql     # Skema profiles, trips, RLS
│   └── seed.sql                       # [OWNER: PERSON 3] Fixture trips
├── src/
│   ├── types/                         # =============================
│   │   ├── api.ts                     # [FROZEN CONTRACT] Standard API envelope
│   │   ├── air-quality.ts             # [FROZEN CONTRACT] Data stasiun & polutan
│   │   ├── routing.ts                 # [FROZEN CONTRACT] Rute, polyline, alternatif
│   │   ├── algorithms.ts              # [FROZEN CONTRACT] Parameter, bobot, hasil kalkulasi
│   │   └── database.ts                # [FROZEN CONTRACT] Tipe Supabase (profiles, trips)
│   ├── fixtures/                      # =============================
│   │   ├── mockStations.ts            # [OWNER: PERSON 2] Sample data WAQI/Open-Meteo
│   │   ├── mockRoutes.ts              # [OWNER: PERSON 2] Sample polyline & OSRM response
│   │   └── mockAnalysis.ts            # [OWNER: PERSON 1] Expected algorithm output
│   ├── config/                        # =============================
│   │   ├── parameters.ts              # [OWNER: PERSON 1] Konstanta PAR-01..14
│   │   └── constants.ts               # [OWNER: PERSON 2] Pilot city bbox, URL endpoint
│   ├── lib/                           # =============================
│   │   ├── algorithms/                # [OWNER: PERSON 1]
│   │   │   ├── aqiConversion.ts       # Konversi AQI -> PM2.5 breakpoint
│   │   │   ├── interpolation.ts       # ALG-02 IDW
│   │   │   ├── exposure.ts            # ALG-01 Perhitungan EI
│   │   │   ├── scoring.ts             # ALG-03 Optimasi & Pareto
│   │   │   └── recommendation.ts      # ALG-04 Rule engine RULE-01..07
│   │   ├── services/                  # [OWNER: PERSON 2]
│   │   │   ├── geocodingService.ts    # Adapter Nominatim + retry/timeout
│   │   │   ├── routingService.ts      # Adapter OSRM / ORS
│   │   │   ├── airQualityService.ts   # Adapter WAQI + Open-Meteo fallback
│   │   │   └── pipelineService.ts     # Integrator: Routes + Air + Algorithms
│   │   ├── supabase/                  # [OWNER: PERSON 3]
│   │   │   ├── client.ts              # Client browser
│   │   │   ├── server.ts              # Server client (cookies)
│   │   │   └── middleware.ts          # Session validator
│   │   └── utils/                     # [OWNER: PERSON 2]
│   │       ├── cache.ts               # Simple in-memory LRU / Map cache
│   │       └── errorHandler.ts        # Format envelope {success, data, error, meta}
│   ├── app/                           # =============================
│   │   ├── globals.css                # [OWNER: PERSON 4] Design tokens & color scale
│   │   ├── layout.tsx                 # [OWNER: PERSON 4] Root layout & navbar shell
│   │   ├── page.tsx                   # [OWNER: PERSON 4] P-01 Beranda
│   │   ├── methodology/page.tsx       # [OWNER: PERSON 4] P-08 Metodologi & Disclaimer
│   │   ├── map/page.tsx               # [OWNER: PERSON 4] P-02 Peta Kualitas Udara
│   │   ├── routes/page.tsx            # [OWNER: PERSON 4] P-03 Perencanaan Rute (Utama)
│   │   ├── login/page.tsx             # [OWNER: PERSON 3] P-04 Auth login & register
│   │   ├── history/                   # [OWNER: PERSON 3] P-05 & P-06
│   │   │   ├── page.tsx               # Daftar riwayat perjalanan
│   │   │   └── [id]/page.tsx          # Detail riwayat perjalanan tersimpan
│   │   ├── settings/page.tsx          # [OWNER: PERSON 3] P-07 Preferensi & Persetujuan
│   │   └── api/                       # API Route Handlers
│   │       ├── geocode/route.ts       # [OWNER: PERSON 2] GET API-02
│   │       ├── air-quality/
│   │       │   └── stations/route.ts  # [OWNER: PERSON 2] GET API-01
│   │       ├── routes/
│   │       │   └── analyze/route.ts   # [OWNER: PERSON 2] POST API-04
│   │       ├── trips/
│   │       │   ├── route.ts           # [OWNER: PERSON 3] GET & POST API-05, API-06
│   │       │   └── [id]/route.ts      # [OWNER: PERSON 3] GET & DELETE API-05
│   │       ├── preferences/route.ts   # [OWNER: PERSON 3] GET & PUT API-07
│   │       └── account/
│   │           ├── consent/route.ts   # [OWNER: PERSON 3] PATCH API-08
│   │           └── route.ts           # [OWNER: PERSON 3] DELETE API-08
│   ├── components/                    # =============================
│   │   ├── common/                    # [OWNER: PERSON 4] Button, Modal, Card, Badge
│   │   ├── map/                       # [OWNER: PERSON 4]
│   │   │   ├── MapContainer.tsx       # Dynamic Leaflet instance
│   │   │   ├── StationMarkers.tsx     # Marker stasiun polusi
│   │   │   └── RoutePolylines.tsx     # Polyline rute berwarna A/B/C
│   │   ├── route-planner/             # [OWNER: PERSON 4]
│   │   │   ├── SearchBox.tsx          # Input asal & tujuan
│   │   │   ├── PreferenceSlider.tsx   # Slider bobot & preset
│   │   │   ├── RouteCompareTable.tsx  # Tabel perbandingan A/B/C
│   │   │   ├── RecommendationCard.tsx # Teks alasan & badge rekomendasi
│   │   │   └── ExposureDetailModal.tsx# 3 kontributor segmen teratas
│   │   └── history/                   # [OWNER: PERSON 3]
│   │       ├── HistoryCard.tsx        # Item riwayat perjalanan
│   │       └── ConsentDialog.tsx      # Modal persetujuan simpan lokasi
│   └── tests/                         # =============================
│       ├── algorithms/                # [OWNER: PERSON 1] TC-01..13
│       ├── services/                  # [OWNER: PERSON 2] TC-14..16
│       └── database/                  # [OWNER: PERSON 3] TC-19..20, TC-22
```

---

## 3. Standar Kontrak Data Bersama (`src/types/`)

Setiap anggota wajib merujuk tipe di bawah ini tanpa mengubah definisinya sendiri-sendiri.

### 3.1 Standard Response Envelope (`src/types/api.ts`)
```typescript
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
  meta: {
    timestamp: string;
    dataMode: 'live' | 'simulation';
    processingTimeMs?: number;
  };
}
```

### 3.2 Air Quality & Station Contract (`src/types/air-quality.ts`)
```typescript
export type FreshnessStatus = 'fresh' | 'stale' | 'expired';
export type AirQualityCategory = 'Baik' | 'Sedang' | 'Tidak Sehat bagi Sensitif' | 'Tidak Sehat' | 'Sangat Tidak Sehat' | 'Berbahaya';

export interface StationData {
  stationId: string;
  stationName: string;
  lat: number;
  lng: number;
  aqi: number | null;
  dominantPollutant: string | null;
  pm25Concentration: number | null; // µg/m³
  pm10Concentration: number | null; // µg/m³
  observedAt: string;              // ISO String (UTC)
  ageMinutes: number;
  freshness: FreshnessStatus;
  dataType: 'station_observation' | 'model_fallback' | 'simulation';
  sourceName: string;
}
```

### 3.3 Routing & Candidate Contract (`src/types/routing.ts`)
```typescript
export interface RouteGeometry {
  coordinates: [number, number][]; // [lat, lng][]
}

export interface RouteCandidate {
  id: string;                      // misal 'route-0'
  label: 'A' | 'B' | 'C';
  distanceMeters: number;
  durationSeconds: number;
  geometry: RouteGeometry;
  isFastest: boolean;
}
```

### 3.4 Algorithm & Analysis Result (`src/types/algorithms.ts`)
```typescript
import { RouteCandidate } from './routing';
import { AirQualityCategory } from './air-quality';

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unavailable';

export interface RouteSegmentExposure {
  segmentIndex: number;
  startCoordinate: [number, number];
  endCoordinate: [number, number];
  lengthMeters: number;
  durationSeconds: number;
  estimatedPm25: number | null; // µg/m³ (null jika no data)
  category: AirQualityCategory | 'Tidak Tersedia';
  percentContribution: number;  // % terhadap total EI
}

export interface RouteExposureEstimate {
  routeLabel: 'A' | 'B' | 'C';
  exposureIndexPm25: number | null; // µg/m³·menit
  avgPm25Concentration: number | null; // µg/m³
  category: AirQualityCategory | 'Tidak Tersedia';
  coverageRatio: number;        // 0.0 - 1.0
  confidenceLevel: ConfidenceLevel;
  maxDataAgeMinutes: number;
  isPartiallyImputed: boolean;
  isDominated: boolean;         // Pareto dominated
  segments: RouteSegmentExposure[];
  topContributors: RouteSegmentExposure[]; // Top 3 segmen
  usedStations: {
    stationId: string;
    stationName: string;
    distanceMeters: number;
    value: number;
    ageMinutes: number;
  }[];
}

export interface RecommendationMessage {
  ruleId: string;
  severity: 'info' | 'warning' | 'alert';
  message: string;
  basis: string;
}

export interface AnalyzeRoutesResponseData {
  routes: (RouteCandidate & {
    estimate: RouteExposureEstimate;
    timeDiffVsFastestMin: number;
    timeDiffPercent: number;
    eiDiffPercentVsFastest: number | null;
  })[];
  recommendedRouteLabel: 'A' | 'B' | 'C';
  recommendationExplanation: string;
  actionMessages: RecommendationMessage[];
  warnings: string[];
  disclaimer: string;
}
```

---

## 4. Pembagian Tugas untuk 4 Orang (Work Breakdown Structure)

---

### PERSON 1: Core Algorithm & Domain Logic Engine
**Fokus:** Seluruh fungsi kalkulasi murni (pure deterministic functions), konversi matematika, algoritma estimasi paparan, pembobotan trade-off, dan aturan rekomendasi. Tidak menyentuh koneksi jaringan, database, maupun UI.

#### 1. File Ownership (Hanya bekerja di sini)
- `src/config/parameters.ts` (Definisi PAR-01 sampai PAR-14)
- `src/lib/algorithms/aqiConversion.ts` (Konversi AQI ke konsentrasi PM2.5)
- `src/lib/algorithms/interpolation.ts` (ALG-02: IDW Interpolation)
- `src/lib/algorithms/exposure.ts` (ALG-01: Estimasi Paparan Perjalanan)
- `src/lib/algorithms/scoring.ts` (ALG-03: Perbandingan Rute, Pareto & Trade-off)
- `src/lib/algorithms/recommendation.ts` (ALG-04: Aturan Rekomendasi RULE-01..07)
- `src/fixtures/mockAnalysis.ts` (Fixture pengujian fungsi kalkulasi)
- `tests/algorithms/*.test.ts` (Unit test TC-01 sampai TC-13)

#### 2. Spesifikasi Implementasi
1. **`aqiConversion.ts`:**
   - Implementasikan fungsi pemetaan linear breakpoint AQI US-EPA / ISPU Indonesia ke konsentrasi PM2.5 ($\mu g/m^3$).
   - Tangani nilai batas atas (clamping) dan nilai $0$. Nilai input invalid harus mengembalikan `null`.
2. **`interpolation.ts` (ALG-02 IDW):**
   - Rumus: $w_j = 1 / d_j^p$ dengan $p = 2$ (`PAR-11`).
   - Anti-singularitas: Jika jarak stasiun $d_j < \epsilon$ ($100\text{ m}$), langsung gunakan nilai stasiun tersebut tanpa pembobotan.
   - Pilih $K = 3$ stasiun terdekat dalam radius $10\text{ km}$ (`PAR-02`). Jika stasiun kosong, kembalikan `null`.
3. **`exposure.ts` (ALG-01):**
   - Lakukan diskritisasi polyline rute ke segmen berjarak $500\text{ m}$ (`PAR-01`).
   - Hitung $\Delta t_i = T \times \frac{L_i}{L_{\text{total}}}$.
   - Hitung coverage ratio: $\text{coverageRatio} = \frac{\sum \Delta t_i \text{ (berdata)}}{T}$.
   - Jika $\text{coverageRatio} \ge 0.2$ (`PAR-08`), hitung $EI = \text{avgPm25} \times T$. Lakukan imputasi rata-rata rute pada segmen berdata kosong (`isPartiallyImputed = true`). Jika $< 0.2$, kembalikan $EI = \text{null}$ dan `confidenceLevel = 'unavailable'`.
   - Klasifikasikan `confidenceLevel` (High, Medium, Low, Unavailable) sesuai Bagian 9.4 PRD.
4. **`scoring.ts` (ALG-03):**
   - Normalisasi rasio waktu $Tn_r = T_r / T_{\min}$ dan paparan $En_r = E_r / E_{\min}$.
   - Hitung skor: $S_r = (1 - w_e) \cdot Tn_r + w_e \cdot En_r$.
   - Terapkan filter batas waktu maksimal: $T_r \le T_{\min} \times (1 + \text{maxExtraTimePercent})$.
   - Ambang signifikansi 5% (`PAR-07`): Jika selisih paparan rute terpilih dibanding rute tercepat $< 5\%$, rekomendasikan rute tercepat dengan keterangan "Perbedaan tidak signifikan".
   - Identifikasi status rute terdominasi (*Pareto dominated*).
5. **`recommendation.ts` (ALG-04):**
   - Evaluasi RULE-01 sampai RULE-07. Maksimal menghasilkan 3 pesan rekomendasi dengan urutan prioritas tingkat keparahan. Dilarang keras memuat klaim medis/dosis inhalasi personal.

#### 3. Kriteria Selesai (Definition of Done)
- Semua fungsi lulus unit test Vitest/Jest (TC-01 s/d TC-13).
- Tidak ada kompilasi error TypeScript; fungsi 100% deterministik dan bebas dependensi luar.

#### 4. Poin Konfirmasi Wajib (Perlu Diklarifikasi Person 1)
> ❓ **Konfirmasi 1.1 (Tabel Breakpoint AQI - OQ-05):** Tabel konversi mana yang disepakati tim untuk mengubah nilai AQI WAQI menjadi konsentrasi $\mu g/m^3$? Apakah standar US-EPA AQI PM2.5 (0-50: 0-12 $\mu g/m^3$, 51-100: 12.1-35.4 $\mu g/m^3$) atau standar ISPU Permen LHK 2020? *(Rekomendasi: Gunakan US-EPA Breakpoint Table karena WAQI secara default menggunakan skala AQI US-EPA).*
>
> ❓ **Konfirmasi 1.2 (Teks Pesan Kesehatan - OQ-06):** Untuk RULE-01 s/d RULE-04, teks resmi panduan mana yang akan disalin ke kode? Apakah tim setuju menggunakan redaksi umum non-klinis: *"Kualitas udara sedang, kelompok sensitif disarankan mengurangi aktivitas luar ruang yang berat"*?
>
> ❓ **Konfirmasi 1.3 (Algoritma Splitting Segmen):** Apakah pembagian segmen $500\text{ m}$ dilakukan dengan menghitung jarak Euclidean datar atau formula Haversine antar titik koordinat polyline? *(Rekomendasi: Gunakan kalkulasi Haversine geodesik sederhana di utilitas).*

---

### PERSON 2: Backend Services, API Adapters & Pipeline Orchestrator
**Fokus:** Integrasi API eksternal (Nominatim Geocoding, OSRM/ORS Routing, WAQI Air Quality, Open-Meteo), caching in-memory, mekanisme fallback/timeout, mode simulasi fixture, dan orchestrasi endpoint analisis rute.

#### 1. File Ownership (Hanya bekerja di sini)
- `src/config/constants.ts` (Pilot city bounding box, timeout limits, URLs)
- `src/fixtures/mockStations.ts` & `mockRoutes.ts` (Fixture rekaman data nyata)
- `src/lib/utils/cache.ts` (In-memory TTL cache dengan LRU/Map sederhana)
- `src/lib/utils/errorHandler.ts` (Standard envelope formatter & error parser)
- `src/lib/services/geocodingService.ts` (Adapter Nominatim)
- `src/lib/services/routingService.ts` (Adapter OSRM / OpenRouteService)
- `src/lib/services/airQualityService.ts` (Adapter WAQI + Open-Meteo fallback)
- `src/lib/services/pipelineService.ts` (Menggabungkan rute + stasiun + algoritma Person 1)
- `src/app/api/geocode/route.ts` (Handler GET Nominatim)
- `src/app/api/air-quality/stations/route.ts` (Handler GET stasiun)
- `src/app/api/routes/analyze/route.ts` (Handler POST analisis rute)
- `tests/services/*.test.ts` (Integration test TC-14..TC-17)

#### 2. Spesifikasi Implementasi
1. **Adapter Geocoding (`geocodingService.ts`):**
   - Panggil Nominatim OSM: `GET https://nominatim.openstreetmap.org/search?format=json&q=...`.
   - Wajib sertakan header `User-Agent` yang jelas (misal: `EcoPulse-Hackathon-App/1.0`).
   - Timeout 5 detik (`PAR-13`), 1x retry. Cache pencarian 24 jam. Batasi hasil maksimal 5 kandidat dalam batas kota pilot.
2. **Adapter Routing (`routingService.ts`):**
   - Default panggil OSRM public demo atau ORS: `GET /route/v1/driving/{lng1},{lat1};{lng2},{lat2}?alternatives=true&overview=full&geometries=geojson`.
   - Timeout 8 detik (`PAR-13`). Jika rute berjarak $< 100\text{ m}$, lempar error 400.
   - Filter duplikasi: Hilangkan rute yang tumpang tindih $> 90\%$ (`PAR-10`).
   - Urutkan kandidat berdasarkan durasi tercepat (label A, B, C).
3. **Adapter Kualitas Udara (`airQualityService.ts`):**
   - Panggil WAQI Bounding Box API: `https://api.waqi.info/v2/map/bounds?latlng=...&token={WAQI_TOKEN}`.
   - Normalisasi: Polutan tidak ada wajib bernilai `null` (bukan 0). Hitung `ageMinutes` dan tentukan `freshness` (fresh $\le 3\text{ jam}$, stale $3-24\text{ jam}$, expired $> 24\text{ jam}$).
   - TTL Cache memori 10 menit (`PAR-12`). Token tidak boleh bocor ke client.
   - Jika WAQI gagal atau tidak ada stasiun, panggil fallback Open-Meteo Air Quality API dengan label `dataType = 'model_fallback'`.
4. **Resiliency & Data Mode:**
   - Jika env `DATA_MODE=simulation`, jangan panggil API eksternal; ambil data instan dari `src/fixtures/mockStations.ts` dan `src/fixtures/mockRoutes.ts`.
5. **Endpoint Handler Orchestration (`/api/routes/analyze/route.ts`):**
   - Terima input: `origin: {lat, lng}`, `destination: {lat, lng}`, `preferences: {exposureWeight, maxExtraTimePercent}`.
   - Alur: Validasi Zod -> Panggil `routingService` -> Ambil stasiun dari `airQualityService` -> Panggil pure functions milik Person 1 (`exposure.ts`, `scoring.ts`, `recommendation.ts`) via `pipelineService` -> Balas dengan format envelope `ApiResponse<AnalyzeRoutesResponseData>`.

#### 3. Kriteria Selesai (Definition of Done)
- Ketiga Route Handler (`/api/geocode`, `/api/air-quality/stations`, `/api/routes/analyze`) berhasil dipanggil melalui Postman/Curl dengan envelope standar.
- Pengujian simulasi dan kegagalan API berjalan sesuai matriks FR-14 (TC-14 s/d TC-17).

#### 4. Poin Konfirmasi Wajib (Perlu Diklarifikasi Person 2)
> ❓ **Konfirmasi 2.1 (Kota Pilot & Bounding Box - OQ-02):** Kota pilot mana yang dipilih untuk demo? (Misal: Kota Semarang atau DKI Jakarta). Tentukan koordinat Bounding Box presisi (`[minLat, minLng, maxLat, maxLng]`) agar validasi geocoding dan pembatasan stasiun bekerja akurat.
>
> ❓ **Konfirmasi 2.2 (Token API WAQI & Mesin Routing - OQ-03 & OQ-04):** Apakah sudah ada token WAQI yang aktif? Untuk routing, apakah OSRM Public Demo cukup stabil atau tim akan mendaftar OpenRouteService (ORS) key gratis sebagai cadangan?
>
> ❓ **Konfirmasi 2.3 (Header Identitas User-Agent Nominatim):** Alamat email/nama project apa yang akan dimasukkan ke `User-Agent` Nominatim agar request geocoding tidak terkena HTTP 403 / banned saat presentasi demo?

---

### PERSON 3: Database, Supabase Auth, History & User Data Privacy
**Fokus:** Pengelolaan autentikasi akun via Supabase Auth, skema tabel PostgreSQL (`profiles`, `trips`), aturan Row Level Security (RLS), endpoint riwayat perjalanan dan preferensi pengguna, serta halaman UI riwayat dan pengaturan.

#### 1. File Ownership (Hanya bekerja di sini)
- `supabase/migrations/001_initial_schema.sql` (Skema DDL tabel dan RLS)
- `supabase/seed.sql` (Seed data untuk demo)
- `src/lib/supabase/client.ts` & `server.ts` & `middleware.ts` (Koneksi Supabase)
- `src/types/database.ts` (Tipe schema Supabase TypeScript)
- `src/app/login/page.tsx` (P-04 Halaman Login & Registrasi)
- `src/app/history/page.tsx` (P-05 Daftar Riwayat Perjalanan)
- `src/app/history/[id]/page.tsx` (P-06 Detail Snapshot Perjalanan)
- `src/app/settings/page.tsx` (P-07 Pengaturan, Consent, Hapus Akun)
- `src/components/history/HistoryCard.tsx` & `ConsentDialog.tsx`
- `src/app/api/trips/route.ts` & `src/app/api/trips/[id]/route.ts` (API-05 & API-06)
- `src/app/api/preferences/route.ts` (API-07)
- `src/app/api/account/consent/route.ts` & `src/app/api/account/route.ts` (API-08)
- `tests/database/*.test.ts` (TC-18 s/d TC-20, TC-22, TC-23)

#### 2. Spesifikasi Implementasi
1. **Skema Database & RLS (`001_initial_schema.sql`):**
   - Buat tabel `profiles` (`user_id`, `exposure_weight`, `max_extra_time_percent`, `history_consent`, `consent_updated_at`, `created_at`). Trigger otomatis insert profil saat user baru terdaftar di `auth.users`.
   - Buat tabel `trips` (`trip_id`, `user_id`, `origin_label`, `destination_label`, `origin_lat/lng`, `destination_lat/lng`, `route_polyline`, `distance_m`, `duration_s`, `analyzed_at`, `exposure_index_pm25`, `avg_pm25`, `aqi_category`, `confidence_level`, `coverage_ratio`, `data_source`, `fastest_duration_s`, `fastest_exposure_index_pm25`, `was_recommended`, `used_exposure_weight`, `estimate_details JSONB`, `algorithm_version`, `created_at`).
   - Aktifkan RLS ketat pada kedua tabel: `WHERE auth.uid() = user_id` untuk SELECT, INSERT, UPDATE, DELETE.
2. **Supabase Auth & Session Middleware (`src/lib/supabase/`):**
   - Atur helper SSR Supabase (`@supabase/ssr`).
   - Proteksi route privat (`/history`, `/settings`) menggunakan middleware. Jika session tidak ada, redirect ke `/login`.
3. **Endpoint Riwayat & Preferensi:**
   - `POST /api/trips`: Validasi `history_consent = true`. Jika belum disetujui, tolak dengan 403 Forbidden. Simpan snapshot data perjalanan.
   - `GET /api/trips`: Paginasi list riwayat perjalanan user saat ini.
   - `GET /api/trips/[id]`: Ambil snapshot lengkap termasuk `estimate_details` JSONB.
   - `DELETE /api/trips/[id]` & `DELETE /api/trips`: Hapus satu atau semua riwayat milik user.
   - `PATCH /api/account/consent`: Tarik / ubah persetujuan privasi.
   - `DELETE /api/account`: Hapus user dari `auth.users` (cascade ke profiles & trips).
4. **Halaman UI Autentikasi & Riwayat:**
   - Bangun antarmuka form login/register di `/login` dengan validasi password $\ge 8$ karakter (huruf + angka).
   - Buat tampilan kartu riwayat di `/history` dengan skeleton loading dan tombol hapus perjalanan.
   - Dialog persetujuan privasi (`ConsentDialog.tsx`) yang muncul sebelum rute disimpan pertama kali.

#### 3. Kriteria Selesai (Definition of Done)
- Alur login, simpan rute, buka riwayat, dan hapus akun berhasil diuji secara end-to-end.
- RLS terbukti mencegah User A melihat atau menghapus perjalanan User B (TC-22 lulus).

#### 4. Poin Konfirmasi Wajib (Perlu Diklarifikasi Person 3)
> ❓ **Konfirmasi 3.1 (Email Confirmation Supabase - ASM-09):** Di dashboard Supabase, apakah fitur "Confirm Email" dinonaktifkan (disabled) agar user yang mendaftar saat hackathon bisa langsung login tanpa perlu verifikasi email? *(Rekomendasi: Wajib dinonaktifkan untuk kelancaran demo).*
>
> ❓ **Konfirmasi 3.2 (Penghapusan Akun Pengguna / User Self-Deletion):** Karena Supabase client-side default tidak mengizinkan `auth.admin.deleteUser()`, apakah penghapusan akun di `DELETE /api/account` akan dijalankan melalui Next.js server route handler yang memegang `SUPABASE_SERVICE_ROLE_KEY`?
>
> ❓ **Konfirmasi 3.3 (Trigger Insert Profile):** Apakah trigger SQL otomatis untuk membuat baris di `public.profiles` setiap kali ada user baru di `auth.users` sudah siap dimasukkan ke migration file `001_initial_schema.sql`?

---

### PERSON 4: Frontend UI/UX, Map Interactive & Navigation Planner
**Fokus:** Desain visual sistem, integrasi peta interaktif Leaflet, visualisasi alternatif rute A/B/C dan stasiun polusi, formulir pencarian dan slider preferensi, tabel perbandingan trade-off, kartu rekomendasi, serta halaman statis metodologi.

#### 1. File Ownership (Hanya bekerja di sini)
- `src/app/globals.css` (Design tokens, glassmorphism, palet warna kategori udara)
- `src/app/layout.tsx` (Navbar, responsive container, footer atribusi)
- `src/app/page.tsx` (P-01 Beranda interaktif)
- `src/app/map/page.tsx` (P-02 Peta Kualitas Udara Kota Pilot)
- `src/app/routes/page.tsx` (P-03 Perencanaan & Perbandingan Rute Utama)
- `src/app/methodology/page.tsx` (P-08 Metodologi, Definisi, Disclaimer & Batasan)
- `src/components/common/*` (Button, Card, Badge, Modal, DisclaimerBanner)
- `src/components/map/MapContainer.tsx` (Dynamic SSR-safe wrapper Leaflet)
- `src/components/map/StationMarkers.tsx` (Marker stasiun berwarna sesuai kategori)
- `src/components/map/RoutePolylines.tsx` (Polyline rute terpilih & alternatif)
- `src/components/route-planner/*` (SearchBox, PreferenceSlider, RouteCompareTable, RecommendationCard, ExposureDetailModal)

#### 2. Spesifikasi Implementasi
1. **Sistem Desain & Konsistensi Warna (`globals.css`):**
   - Skala warna konsisten (PRD Bagian 10.3):
     - Baik: Hijau (`#10B981`)
     - Sedang: Kuning (`#F59E0B`)
     - Tidak Sehat bagi Sensitif: Jingga (`#F97316`)
     - Tidak Sehat: Merah (`#EF4444`)
     - Sangat Tidak Sehat: Ungu (`#8B5CF6`)
     - Berbahaya: Marun (`#7F1D1D`)
   - Gunakan font modern (Inter/Plus Jakarta Sans) dan styling elegan (Clean Modern/Dark-mode ready).
2. **Peta Interaktif SSR-Safe (`MapContainer.tsx`):**
   - Leaflet tidak dapat dirender di Node.js server. Wajib gunakan dynamic import:
     `const Map = dynamic(() => import('@/components/map/LeafletInnerMap'), { ssr: false });`
   - Sediakan tile layer OSM standar dengan atribusi lengkap.
3. **Peta Kualitas Udara (`/map` - P-02):**
   - Ambil data stasiun dari `GET /api/air-quality/stations` (atau mock). Tampilkan marker berwarna. Klik marker memunculkan popup: Nama, AQI, Dominant Pollutant, Jam Observasi, Usia Data, Status Kesegaran, dan Sumber.
4. **Alur Perencanaan Rute (`/routes` - P-03):**
   - Input Asal & Tujuan (`SearchBox.tsx`): Menghubungkan ke `GET /api/geocode` atau klik langsung pada peta.
   - Preference Control (`PreferenceSlider.tsx`): Preset tombol cepat ("Tercepat: Bobot 0.0", "Seimbang: Bobot 0.5", "Udara Bersih: Bobot 0.8") dan slider kustom + batas waktu maksimal (+30%).
   - Loading State bertahap: "Mencari rute alternatif..." -> "Menganalisis kualitas udara..." -> "Menghitung estimasi paparan...".
   - Tabel Perbandingan (`RouteCompareTable.tsx`): Tampilkan rute A, B, C; kolom durasi, jarak, skor $EI$, selisih vs tercepat, dan tingkat keyakinan (High/Med/Low).
   - Kartu Rekomendasi (`RecommendationCard.tsx`): Menampilkan rute yang direkomendasikan beserta penjelasan narasi trade-off (misal: *"+3 menit, estimasi paparan -16%"*) dan pesan peringatan RULE-01..07.
   - Detail Segmen (`ExposureDetailModal.tsx`): Tampilkan 3 segmen kontributor polusi terbesar dan daftar stasiun yang digunakan.
   - Tombol "Simpan Perjalanan": Memanggil handler simpan milik Person 3 jika user telah login.
5. **Banner Simulasi & Disclaimer:**
   - Tampilkan banner peringatan "DATA SIMULASI" jika `meta.dataMode === 'simulation'`.
   - Di setiap kartu hasil, sertakan teks: *"Estimasi indikator paparan lingkungan, bukan dosis inhalasi klinis"*.

#### 3. Kriteria Selesai (Definition of Done)
- Tampilan responsif hingga layar HP $\ge 360\text{ px}$.
- Alur pemilihan rute hingga munculnya tabel rekomendasi berjalan mulus tanpa error console (TC-33).

#### 4. Poin Konfirmasi Wajib (Perlu Diklarifikasi Person 4)
> ❓ **Konfirmasi 4.1 (Mekanisme Pemilihan Titik Lewat Klik Peta - FR-02):** Bagaimana UX pemilihan via peta di P-03? Apakah dengan klik kanan untuk titik asal dan klik kiri untuk titik tujuan, atau menyediakan tombol toggle "Pilih Asal di Peta" / "Pilih Tujuan di Peta"? *(Rekomendasi: Sediakan tombol toggle agar ramah pengguna HP/mobile).*
>
> ❓ **Konfirmasi 4.2 (Atribusi OpenStreetMap & WAQI di Footer):** Apakah penempatan atribusi OpenStreetMap, Nominatim, dan WAQI cukup diletakkan di pojok kanan bawah container Leaflet dan footer global `layout.tsx`?
>
> ❓ **Konfirmasi 4.3 (Handling Client State Tanpa Fetch Ulang):** Sesuai AC-07.3, jika pengguna hanya menggeser slider preferensi tanpa mengubah asal-tujuan, apakah kalkulasi ulang skor rekomendasi dipanggil kembali ke server API atau dihitung ulang di state klien? *(Rekomendasi: Kirim request ringan ke endpoint analisis atau gunakan pure function scoring Person 1 di client).*

---

## 5. Protokol Kerja Git & Integrasi Anti-Konflik

Untuk menjamin **nol merge conflict**, tim wajib mengikuti SOP Git berikut:

### 5.1 Struktur Branch
- `main`: Branch produksi, terkunci (*protected*). Hanya menerima merge dari Pull Request yang disetujui.
- `feat/p1-algorithms`: Branch khusus Person 1
- `feat/p2-services-api`: Branch khusus Person 2
- `feat/p3-supabase-auth`: Branch khusus Person 3
- `feat/p4-frontend-ui`: Branch khusus Person 4

### 5.2 Timeline & Protokol Integrasi Harian

```
Hari 1 (0-3 Jam)   : PLENO BERSAMA -> Setup Repo, Sepakati src/types/* (FROZEN CONTRACT), Setup .env.example
Hari 1 (3-8 Jam)   : ISOLASI TOTAL ->
                     - P1: Selesaikan parameter.ts & pure functions kalkulasi + unit test
                     - P2: Selesaikan adapter Nominatim, WAQI, OSRM + in-memory cache
                     - P3: Selesaikan skema SQL Supabase, RLS, & Auth middleware
                     - P4: Selesaikan Layout, globals.css design system, & MapContainer Leaflet
Hari 2 (Pagi)      : INTEGRASI TAHAP 1 (Merge P1 & P2 ke main) -> Pipeline analisis rute terbentuk
Hari 2 (Siang-Sore): P4 menghubungkan UI routes ke endpoint P2 (sebelumnya pakai mock)
                     P3 menyelesaikan UI Riwayat & integrasi simpan snapshot
Hari 3 (Pagi)      : INTEGRASI TAHAP 2 (Merge P3 & P4 ke main) -> Seluruh alur end-to-end terhubung
Hari 3 (Siang)     : Pengujian skenario kegagalan (TC-14 s/d TC-26), Usability testing, Video demo & deploy Vercel
```

### 5.3 Golden Rules Pencegahan Konflik
1. **Dilarang menambahkan dependensi npm secara sembarangan di tengah jalan.** Semua package dasar (`leaflet`, `@types/leaflet`, `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `lucide-react`) di-install bersama di Hari 1 oleh Person 2.
2. **Jangan pernah mengedit file orang lain.** Jika butuh perubahan pada adapter milik Person 2, Person 4 tidak boleh mengubah file tersebut sendiri; mintalah Person 2 untuk memperbaruinya.
3. **Selalu gunakan Git Rebase sebelum membuat Pull Request:**
   ```bash
   git fetch origin
   git rebase origin/main
   git push origin feat/pX-... --force-with-lease
   ```

---

## 6. Ringkasan Matriks Konfirmasi Tim

Sebelum baris kode pertama ditulis, seluruh tim wajib duduk bersama selama 30 menit untuk menyepakati tabel konfirmasi berikut:

| No | Kategori | Pertanyaan Kritis | Penanggung Jawab | Opsi Rekomendasi | Status |
|:---|:---|:---|:---|:---|:---|
| 1 | Lingkup | Format pengumpulan & jam deadline hackathon (OQ-01) | Seluruh Tim | Repositori GitHub + Vercel Deploy + Video 3 menit | [ ] Pending |
| 2 | Wilayah | Kota pilot & koordinat Bounding Box (OQ-02) | Person 2 & 4 | DKI Jakarta atau Semarang (berdasarkan ketersediaan stasiun WAQI aktif) | [ ] Pending |
| 3 | Token | Token API WAQI & ORS (OQ-03, OQ-04) | Person 2 | Buat token WAQI gratis; fallback OSRM public demo | [ ] Pending |
| 4 | Algoritma | Versi tabel breakpoint AQI PM2.5 (OQ-05) | Person 1 | US-EPA Standard PM2.5 Breakpoints | [ ] Pending |
| 5 | Kebijakan | Teks narasi anjuran kesehatan (OQ-06) | Person 1 | Redaksi non-klinis berbasis aturan WHO/ISPU tanpa klaim medis | [ ] Pending |
| 6 | Database | Konfirmasi Email Supabase dimatikan (ASM-09) | Person 3 | Disable email confirmation di Supabase Dashboard | [ ] Pending |
| 7 | UI/UX | Alur klik peta untuk penentuan asal/tujuan | Person 4 | Tombol toggle interaktif "Tandai di Peta" | [ ] Pending |
| 8 | Ketahanan | Ketersediaan file mock simulasi saat juri menguji | Person 2 | Otomatis fallback ke `mockStations.ts` jika API eksternal timeout | [ ] Pending |
