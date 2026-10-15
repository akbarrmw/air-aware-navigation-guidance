# Code Specification — AANG (Air-Aware Navigation Guidance)

Diturunkan dari `PRD_AANG_Hackathon.md` (v0.2). Dokumen ini adalah checklist pembangunan resmi: daftar semua file, pemilik, tanggung jawab, kontrak data, API, skema DB, pembagian tugas 4 orang, dan butir yang **wajib dikonfirmasi** per tugas.

Tidak ada tenggat dalam dokumen ini. Urutan kerja ditentukan oleh **gate dependensi** (Bagian 12), bukan hari atau jam.

---

## 0. Ringkasan Perubahan dari Draf Sebelumnya

| No | Masalah di draf lama | Perbaikan di v2 |
|---|---|---|
| 1 | `maxExtraTimePercent` dipakai sebagai pecahan (`1 + x`), padahal PRD dan DB menyimpannya sebagai persen 0–100 | Satuan **persen** ditulis di kontrak; rumus ALG-03 memakai `x / 100` (Bagian 3, 6.2) |
| 2 | Kontrak hanya memuat respons; tidak ada tipe request analisis, geocoding, preferensi, payload simpan trip, tanda tangan fungsi algoritma | Kontrak dilengkapi (Bagian 3) |
| 3 | `recommendedRouteLabel` tidak boleh null; `warnings` berupa `string[]` | Nullable dan `ApiWarning {code, message}` |
| 4 | Risiko tertukar lat/lng (OSRM GeoJSON = `[lng, lat]`) | Konversi hanya di `routingService`, dengan tes wajib (TC-26b) |
| 5 | Asumsi WAQI `map/bounds` memberi PM2.5 per polutan | Ditandai **belum terverifikasi**; ada tugas spike verifikasi sebelum adapter dikunci (Bagian 7, S1) |
| 6 | Kontrak dibekukan sebelum keputusan breakpoint AQI | Kontrak memakai kode kategori netral; keputusan breakpoint adalah syarat gate G0 |
| 7 | `middleware.ts` root, `LeafletInnerMap.tsx`, konfigurasi tes/build, README, CODEOWNERS tidak punya pemilik | Semua file berpemilik (Bagian 2) |
| 8 | `package.json`, lockfile, `.env.example`, `tsconfig` jadi file bersama | Dibuat sekali di commit scaffold (P1), lalu perubahan lewat satu pintu |
| 9 | Dependensi silang tanpa stub (komponen umum, ConsentDialog, status login, fixture analisis, bbox kota) | Daftar stub scaffold (Bagian 11) |
| 10 | Beban P4 terlalu berat, P1 terlalu ringan | Beranda dan Metodologi → P1; halaman Peta Udara (P-02) → P3 |
| 11 | Path tes tidak konsisten; beberapa TC tanpa pemilik | Tes di `tests/<area>/`; semua TC punya pemilik (Bagian 14) |
| 12 | Cache memori dianggap cukup | Dicatat sebagai *best-effort* di serverless; butuh konfirmasi (P2) |
| 13 | Branch panjang dengan merge besar | PR kecil dan sering ke `main` setelah gate G0; cek kepemilikan otomatis |
| 14 | CODEOWNERS wajib-review akan memblokir penulis yang sekaligus pemilik | CODEOWNERS hanya untuk notifikasi; review silang bergilir |

### Keputusan default yang dipilih (bisa diubah lewat konfirmasi)
| ID | Keputusan | Dikonfirmasi di |
|---|---|---|
| D1 | TypeScript strict, Next.js App Router | K-G1 |
| D2 | Styling: **CSS Modules + CSS variables** (tanpa Tailwind, agar tidak ada config bersama) | K-G2 |
| D3 | Skala AQI: **US-EPA 6 kategori**; versi tabel breakpoint dipilih tim | K-G3 |
| D4 | `maxExtraTimePercent` dalam **persen**; `null` = tidak dibatasi | — (kontrak) |
| D5 | Titik di luar kota pilot: analisis **tetap berjalan untuk rute dan waktu**, estimasi "tidak tersedia" + warning `OUTSIDE_COVERAGE` | K-P2.5 |
| D6 | Perhitungan ulang saat slider berubah dilakukan **di klien** memakai `decideRoutes` (fungsi murni isomorfik) | K-P4.3 |
| D7 | Tanpa barrel `index.ts` | — |
| D8 | Tes di `tests/` (root), bukan di `src/` | — |
| D9 | Tile peta: OSM publik (demo) dengan atribusi | K-P4.2 |
| D10 | Mode `DATA_MODE=simulation` memakai fixture, selalu berbanner | — |

---

## 1. Prinsip Arsitektur Anti-Konflik

1. **Satu path, satu pemilik.** Tidak ada file yang disentuh dua orang. Pengecualian hanya commit scaffold awal (Bagian 11).
2. **Contract-first.** Folder `src/types/` dibuat di scaffold dan dibekukan. Perubahan hanya lewat protokol Bagian 12.3.
3. **Stub-first.** Setiap titik impor lintas pemilik sudah ada stub yang valid saat gate G0, sehingga tidak ada yang menunggu atau membuat file di folder orang lain.
4. **Tanpa file pusat.** Tidak ada barrel `index.ts`, registry rute, atau file CSS/konfigurasi yang diedit banyak orang. Next.js memakai routing berbasis folder; tiap komponen punya `*.module.css` sendiri.
5. **Fungsi murni terpisah dari efek samping.** `src/lib/algorithms/` tidak mengimpor jaringan, DB, atau React, dan aman dijalankan di server maupun browser.
6. **Isomorfik di tempat yang perlu.** `decideRoutes` dipakai server (analyze) dan klien (hitung ulang preferensi), sehingga wajib bebas API Node.
7. **Kata kunci permintaan perubahan lintas pemilik:** GitHub Issue berlabel `request:p1`..`request:p4`. Sementara itu peminta memakai stub.

### 1.1 Tech Stack
| Lapisan | Pilihan | Catatan |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript strict | Versi dipilih saat scaffold (K-G1) |
| Peta | Leaflet + `react-leaflet`, impor dinamis tanpa SSR | OSM tile + atribusi |
| DB + Auth | Supabase (Postgres, Auth, RLS) + `@supabase/ssr` | Konfirmasi email dimatikan (ASM-09) |
| Validasi | Zod | Skema di `src/types/schemas.ts` |
| Tes | Vitest | Konfigurasi di scaffold |
| Polyline | `@mapbox/polyline` (encode/decode untuk simpan trip) | Dipasang di scaffold |
| Format | Prettier + ESLint, `.gitattributes` (`eol=lf`) | Hindari konflik whitespace/CRLF |

### 1.2 Konvensi Penamaan
| Lapisan | Konvensi | Contoh |
|---|---|---|
| Tabel/kolom SQL | `snake_case` | `trip_id`, `exposure_index_pm25` |
| Variabel, fungsi, properti JSON, field body | `camelCase` | `tripId`, `exposureIndexPm25` |
| Tipe dan komponen React | `PascalCase` | `StationData`, `RouteCompareTable.tsx` |
| Berkas non-komponen | `camelCase.ts` | `routingService.ts` |
| Env var | `UPPER_SNAKE_CASE` | `WAQI_TOKEN` |
| Atribut `id` dan `data-testid` | `camelCase` | `originInput`, `recommendationCard` |

Pemetaan `snake_case` → `camelCase` hanya terjadi di `src/lib/trips/tripMapper.ts` (P3). Komponen dan API publik tidak pernah melihat `snake_case`.

---

## 2. Struktur Folder dan Peta Kepemilikan

Legenda pemilik: **P1** Integrator, Kontrak, Algoritma · **P2** Integrasi API dan Backend Analisis · **P3** Auth, DB, Riwayat, Pengaturan, Peta Udara · **P4** Desain Sistem, Peta, Perencana Rute.

```
ecopulse/
├── package.json, package-lock.json, tsconfig.json, next.config.ts      [P1 — scaffold, lalu satu pintu]
├── eslint.config.mjs, .prettierrc, .gitattributes, .gitignore           [P1 — scaffold]
├── vitest.config.ts, .env.example, README.md                            [P1]
├── .github/CODEOWNERS, .github/pull_request_template.md                 [P1]
├── scripts/checkOwnership.mjs, scripts/evalLeaveOneOut.ts               [P1]
├── supabase/migrations/001_initial_schema.sql, supabase/seed.sql        [P3]
├── docs/p1-*.md  docs/p2-*.md  docs/p3-*.md  docs/p4-*.md               [masing-masing pemilik]
├── tests/
│   ├── algorithms/                                                      [P1]
│   ├── services/                                                        [P2]
│   ├── database/                                                        [P3]
│   └── ui/                                                              [P4]
└── src/
    ├── types/                                                           [P1 — FROZEN setelah G0]
    ├── fixtures/ mockAnalysis.ts [P1] · mockStations.ts mockRoutes.ts mockGeocode.ts [P2]
    ├── config/   parameters.ts [P1] · constants.ts [P2]
    ├── middleware.ts                                                    [P3]
    ├── lib/
    │   ├── algorithms/                                                  [P1]
    │   ├── server/ apiResponse.ts withApiHandler.ts                     [P1 — FROZEN, dipakai semua handler]
    │   ├── services/   utils/                                           [P2]
    │   ├── supabase/   trips/                                           [P3]
    │   └── client/  analyzeApi.ts geocodeApi.ts hooks/ preferenceSession.ts [P4]
    │            tripsApi.ts preferencesApi.ts accountApi.ts auth/        [P3]
    ├── app/
    │   ├── page.tsx, methodology/                                       [P1]
    │   ├── layout.tsx, globals.css, routes/                             [P4]
    │   ├── map/, login/, history/, settings/                            [P3]
    │   └── api/ geocode/ air-quality/ routes/analyze/                   [P2]
    │            trips/ preferences/ account/ exposure/                  [P3]
    └── components/
        ├── common/ layout/ map/ route-planner/                          [P4]
        └── history/ auth/ settings/ air-map/                            [P3]
```

Daftar file per orang ada di Bagian 6–9; masing-masing path hanya muncul di satu tabel.

---

## 3. Kontrak Data Bersama (`src/types/`)

Dibuat di scaffold (P1), dibekukan setelah gate G0. Kode di bawah adalah tipe saja.

### 3.1 `common.ts`
```ts
export type RouteLabel = 'A' | 'B' | 'C';
export type DataMode = 'live' | 'simulation';
export type DataType = 'station_observation' | 'model_fallback' | 'simulation';

export interface LatLng { lat: number; lng: number }

/** URUTAN WAJIB [lat, lng]. OSRM/GeoJSON memakai [lng, lat]; konversi HANYA di routingService. */
export type LatLngTuple = [number, number];

export interface BoundingBox { south: number; west: number; north: number; east: number }
export interface LocationPoint { label?: string; lat: number; lng: number }
```

### 3.2 `api.ts`
```ts
export type ErrorCode =
  | 'VALIDATION_ERROR' | 'UNAUTHENTICATED' | 'CONSENT_REQUIRED' | 'FORBIDDEN'
  | 'NOT_FOUND' | 'NO_ROUTE_FOUND' | 'UPSTREAM_ERROR' | 'UPSTREAM_TIMEOUT'
  | 'RATE_LIMITED' | 'INTERNAL_ERROR';

export type WarningCode =
  | 'OUTSIDE_COVERAGE' | 'SINGLE_ROUTE_ONLY' | 'AIR_DATA_CACHED' | 'AIR_DATA_UNAVAILABLE'
  | 'STATION_DATA_STALE' | 'LOW_CONFIDENCE' | 'MODEL_DATA_USED' | 'SIMULATION_DATA' | 'NO_TRAFFIC_DATA';

export interface ApiWarning { code: WarningCode; message: string }
export interface ApiError { code: ErrorCode; message: string; details?: unknown }

export interface ApiMeta {
  timestamp: string;            // ISO UTC
  dataMode: DataMode;
  processingTimeMs?: number;
  page?: number; pageSize?: number; total?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  meta: ApiMeta;
}
```

### 3.3 `aqiScale.ts` (nilai konstan, dibagikan)
```ts
export type AqiCategoryCode =
  'good' | 'moderate' | 'unhealthySensitive' | 'unhealthy' | 'veryUnhealthy' | 'hazardous';

export interface AqiCategoryInfo { code: AqiCategoryCode; labelId: string; color: string; order: number }

export const AQI_CATEGORIES: readonly AqiCategoryInfo[] = [
  { code: 'good',               labelId: 'Baik',                       color: '#10B981', order: 0 },
  { code: 'moderate',           labelId: 'Sedang',                     color: '#F59E0B', order: 1 },
  { code: 'unhealthySensitive', labelId: 'Tidak Sehat bagi Sensitif',  color: '#F97316', order: 2 },
  { code: 'unhealthy',          labelId: 'Tidak Sehat',                color: '#EF4444', order: 3 },
  { code: 'veryUnhealthy',      labelId: 'Sangat Tidak Sehat',         color: '#8B5CF6', order: 4 },
  { code: 'hazardous',          labelId: 'Berbahaya',                  color: '#7F1D1D', order: 5 },
];
export const AQI_UNAVAILABLE_COLOR = '#9CA3AF';
```
Angka breakpoint **tidak** ada di kontrak; berada di `aqiConversion.ts` (P1) dan bergantung pada keputusan K-G3. Jika tim memilih ISPU (5 kategori), perubahan dilakukan **sebelum** G0.

### 3.3b `air-quality.ts`
```ts
export type FreshnessStatus = 'fresh' | 'stale' | 'expired';

export interface StationData {
  stationId: string;
  stationName: string;
  lat: number; lng: number;
  aqi: number | null;
  dominantPollutant: string | null;
  pm25Concentration: number | null;          // µg/m³; null = tidak tersedia (BUKAN 0)
  pm25Origin: 'measured' | 'derivedFromAqi' | null;
  pm10Concentration: number | null;
  observedAt: string | null;                 // ISO UTC; null → dianggap expired
  ageMinutes: number | null;
  freshness: FreshnessStatus;
  dataType: DataType;
  sourceName: string;
}

export interface StationsPayload {
  stations: StationData[];
  bbox: BoundingBox;
  fetchedAt: string;
  fromCache: boolean;
  warnings: ApiWarning[];
}
```

### 3.4 `geocoding.ts`, `routing.ts`, `preferences.ts`
```ts
export interface LocationCandidate { label: string; lat: number; lng: number; withinPilotArea: boolean }
export interface GeocodePayload { query: string; candidates: LocationCandidate[] }

export interface RouteCandidate {
  id: string;                                // 'route-0'
  label: RouteLabel;
  distanceMeters: number;
  durationSeconds: number;
  geometry: { coordinates: LatLngTuple[] };
  isFastest: boolean;
}

export interface RoutePreferences {
  exposureWeight: number;                    // 0..1
  maxExtraTimePercent: number | null;        // PERSEN 0..100; null = tidak dibatasi
}
export const ROUTE_PRESETS = { fastest: 0, balanced: 0.5, clean: 0.8 } as const;
export const DEFAULT_PREFERENCES: RoutePreferences = { exposureWeight: 0.5, maxExtraTimePercent: 30 };
```

### 3.5 `algorithms.ts`
```ts
import type { AqiCategoryCode } from './aqiScale';
import type { LatLngTuple, RouteLabel } from './common';
import type { StationData, FreshnessStatus } from './air-quality';
import type { RouteCandidate } from './routing';
import type { RoutePreferences } from './preferences';

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unavailable';
export type UncertaintyClass = 'near' | 'medium' | 'none';

export interface AlgorithmParams {            // nilai di src/config/parameters.ts
  segmentLengthMeters: number;                // PAR-01
  stationRadiusMeters: number;                // PAR-02
  nearestStationCount: number;                // PAR-03
  freshMaxMinutes: number;                    // PAR-04
  expiredAfterMinutes: number;                // PAR-05
  nearDistanceMeters: number;                 // PAR-06
  significanceThresholdPercent: number;       // PAR-07
  minCoverageRatio: number;                   // PAR-08
  duplicateOverlapPercent: number;            // PAR-10
  idwPower: number;                           // PAR-11
  idwEpsilonMeters: number;                   // PAR-11
  longTripMinutes: number;                    // PAR-14
}

export interface SegmentExposure {
  segmentIndex: number;
  startKm: number; endKm: number;
  path: LatLngTuple[];                        // untuk pewarnaan peta
  durationSeconds: number;
  pm25: number | null;                        // null = tanpa data
  category: AqiCategoryCode | null;
  uncertaintyClass: UncertaintyClass;
  contributionPercent: number | null;         // null bila EI tidak tersedia
}

export interface StationUsed {
  stationId: string; stationName: string;
  distanceMeters: number; pm25: number;
  ageMinutes: number | null; freshness: FreshnessStatus;
  dataType: StationData['dataType'];
}

export interface RouteExposureEstimate {
  exposureIndexPm25: number | null;           // µg/m³·menit
  avgPm25: number | null;
  category: AqiCategoryCode | null;
  coverageRatio: number;                      // 0..1
  confidenceLevel: ConfidenceLevel;
  maxDataAgeMinutes: number | null;
  isPartiallyImputed: boolean;
  segments: SegmentExposure[];
  topContributors: SegmentExposure[];         // maks 3
  stationsUsed: StationUsed[];
}

export interface ActionMessage {
  ruleId: 'RULE-01'|'RULE-02'|'RULE-03'|'RULE-04'|'RULE-05'|'RULE-06'|'RULE-07';
  severity: 'info' | 'attention' | 'warning';
  message: string;
  basis: string;
}

export interface RouteComparison {
  extraSeconds: number;
  extraPercent: number;
  exposureDeltaPercent: number | null;        // vs rute tercepat; negatif = lebih rendah
}

export interface AnalyzedRoute extends RouteCandidate {
  estimate: RouteExposureEstimate;
  comparison: RouteComparison;
  withinTimeLimit: boolean;
  isDominated: boolean;
  score: number | null;
}

export type ExplanationReason =
  'BETTER_EXPOSURE' | 'FASTEST_IS_BEST' | 'DIFFERENCE_NOT_SIGNIFICANT' | 'NO_ESTIMATE' | 'SINGLE_ROUTE';

export interface ExplanationInfo {
  reasonCode: ExplanationReason;
  text: string;                               // dirakit dari figures di bawah (TC-32)
  extraMinutes: number | null;
  extraPercent: number | null;
  exposureDeltaPercent: number | null;
  isSignificant: boolean;
}

export interface DecisionResult {
  routes: AnalyzedRoute[];
  recommendedRouteLabel: RouteLabel | null;   // null bila semua estimasi tidak tersedia
  explanation: ExplanationInfo;
  actionMessages: ActionMessage[];            // maks 3
}
```

### 3.6 `analyze.ts`, `trips.ts`
```ts
export interface AnalyzeRoutesRequest {
  origin: LocationPoint;
  destination: LocationPoint;
  preferences: RoutePreferences;
}

export interface DataSourceInfo { sourceName: string; dataType: DataType; attributionText: string; observedRange?: { oldest: string; newest: string } }

export interface AnalyzeRoutesResponseData extends DecisionResult {
  dataSources: DataSourceInfo[];
  warnings: ApiWarning[];
  disclaimer: string;
  algorithmVersion: string;
}

// ---- trips ----
export interface TripSavePayload {
  origin: LocationPoint;
  destination: LocationPoint;
  selectedRoute: AnalyzedRoute;               // snapshot rute terpilih
  fastest: { durationSeconds: number; exposureIndexPm25: number | null };
  wasRecommended: boolean;
  usedExposureWeight: number;
  dataSources: DataSourceInfo[];
  algorithmVersion: string;
}

export interface TripListItem {
  tripId: string; originLabel: string; destinationLabel: string;
  analyzedAt: string; distanceMeters: number; durationSeconds: number;
  exposureIndexPm25: number | null; avgPm25: number | null;
  category: AqiCategoryCode | null; confidenceLevel: ConfidenceLevel;
  wasRecommended: boolean;
}

export interface TripDetail extends TripListItem {
  origin: LatLng; destination: LatLng;
  geometry: LatLngTuple[];                    // di-decode server dari polyline
  coverageRatio: number | null;
  dataSource: string;
  fastest: { durationSeconds: number; exposureIndexPm25: number | null };
  usedExposureWeight: number;
  estimate: RouteExposureEstimate | null;     // dari estimate_details
  algorithmVersion: string;
}

export interface PreferencesPayload extends RoutePreferences { historyConsent: boolean }
```
Catatan: server **tidak** menghitung ulang estimasi saat simpan; ia menyimpan snapshot yang dikirim klien (milik pengguna sendiri). Validasi Zod memastikan bentuk dan rentang, bukan kebenaran hitungan (K-P3.5).

### 3.7 `schemas.ts`
Skema Zod untuk: `StationsQuery`, `GeocodeQuery`, `AnalyzeRoutesRequest`, `TripSavePayload`, `PreferencesPayload`, `ConsentPayload {historyConsent}`, `DeleteAccountPayload {password}`, `TripListQuery {page, pageSize}`. Satu sumber validasi untuk client dan server (AC-10.4, TC-21).

### 3.8 Kontrak fungsi algoritma (`src/lib/algorithms/`, milik P1)
```ts
aqiToPm25(aqi: number | null): number | null
pm25ToCategory(pm25: number | null): AqiCategoryCode | null
haversineMeters(a: LatLngTuple, b: LatLngTuple): number
splitPath(path: LatLngTuple[], segmentLengthMeters: number): PathSegment[]
idwAtPoint(point: LatLngTuple, stations: StationData[], p: AlgorithmParams): IdwResult
computeRouteExposure(input: { route: RouteCandidate; stations: StationData[]; params: AlgorithmParams; now: string }): RouteExposureEstimate
decideRoutes(input: { routes: Array<RouteCandidate & { estimate: RouteExposureEstimate }>;
                      preferences: RoutePreferences; params: AlgorithmParams; now: string }): DecisionResult
evaluateRecommendations(ctx: RecommendationContext): ActionMessage[]
```
`decideRoutes` menggabungkan skor, Pareto, penjelasan, dan rekomendasi; dipakai `pipelineService` (P2) dan klien (P4).

---

## 4. Skema Database (milik P3)

`supabase/migrations/001_initial_schema.sql`

### 4.1 `profiles`
| Kolom | Tipe | Constraint |
|---|---|---|
| `user_id` | `uuid` | PK, FK → `auth.users(id)` ON DELETE CASCADE |
| `exposure_weight` | `numeric(3,2)` | NOT NULL DEFAULT 0.50, CHECK 0–1 |
| `max_extra_time_percent` | `smallint` | NULL (null = tidak dibatasi), DEFAULT 30, CHECK 0–100 |
| `history_consent` | `boolean` | NOT NULL DEFAULT false |
| `consent_updated_at` | `timestamptz` | NULL |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |

Trigger `AFTER INSERT ON auth.users` membuat baris `profiles` otomatis.

### 4.2 `trips`
| Kolom | Tipe | Constraint |
|---|---|---|
| `trip_id` | `uuid` | PK DEFAULT gen_random_uuid() |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE |
| `origin_label`, `destination_label` | `text` | NOT NULL |
| `origin_lat`, `origin_lng`, `destination_lat`, `destination_lng` | `numeric(9,6)` | NOT NULL, CHECK rentang koordinat |
| `route_polyline` | `text` | NOT NULL |
| `distance_m`, `duration_s` | `integer` | NOT NULL, CHECK > 0 |
| `analyzed_at` | `timestamptz` | NOT NULL |
| `exposure_index_pm25`, `avg_pm25` | `numeric` | NULL |
| `aqi_category` | `text` | NULL (kode kategori, mis. `moderate`) |
| `confidence_level` | `text` | NOT NULL, CHECK IN ('high','medium','low','unavailable') |
| `coverage_ratio` | `numeric(3,2)` | NULL, CHECK 0–1 |
| `data_source` | `text` | NOT NULL |
| `fastest_duration_s` | `integer` | NOT NULL |
| `fastest_exposure_index_pm25` | `numeric` | NULL |
| `was_recommended` | `boolean` | NOT NULL |
| `used_exposure_weight` | `numeric(3,2)` | NOT NULL |
| `estimate_details` | `jsonb` | NULL (segmen + stasiun dipakai) |
| `algorithm_version` | `text` | NOT NULL |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |

Indeks `(user_id, created_at DESC)`.

### 4.3 RLS
Aktif pada kedua tabel. Kebijakan: `profiles` SELECT/UPDATE `WHERE auth.uid() = user_id`; `trips` SELECT/INSERT/DELETE `WHERE auth.uid() = user_id`. Penghapusan akun memakai klien admin di server (service role), tidak pernah di klien browser.

---

## 5. Konfigurasi dan Environment

`.env.example` dibuat **lengkap** di scaffold (P1) sehingga tidak ada yang mengeditnya sesudahnya.

| Variabel | Pemilik | Publik? | Keterangan |
|---|---|---|---|
| `DATA_MODE` | P2 | tidak | `live` / `simulation` |
| `WAQI_TOKEN` | P2 | tidak | server only |
| `ROUTING_BASE_URL` | P2 | tidak | OSRM demo atau ORS |
| `ORS_API_KEY` | P2 | tidak | opsional |
| `GEOCODER_BASE_URL`, `GEOCODER_USER_AGENT` | P2 | tidak | identitas aplikasi wajib |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | P3 | ya | |
| `SUPABASE_SERVICE_ROLE_KEY` | P3 | **tidak, jangan pernah ke klien** | hanya `DELETE /api/account` |

Parameter bisnis: `src/config/parameters.ts` (P1, PAR-01..14, satu sumber) dan `src/config/constants.ts` (P2: bbox kota pilot, pusat peta, batas jumlah panggilan detail stasiun, timeout PAR-13).

---

## 6. PERSON 1 — Integrator, Kontrak, dan Mesin Algoritma

**Peran:** membuat scaffold dan kontrak (gate G0), seluruh logika perhitungan murni, serta halaman statis. Bekerja tanpa jaringan, DB, atau React (kecuali dua halaman statis).

### 6.1 File yang dimiliki
| Path | Tanggung jawab | Ref |
|---|---|---|
| `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `.prettierrc`, `.gitattributes`, `.gitignore`, `vitest.config.ts` | Scaffold; semua dependensi diketahui dipasang sekali (Next, React, `react-leaflet`/`leaflet`, `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `@mapbox/polyline`, `vitest`, tipe terkait). Perubahan dependensi lewat Issue `request:p1` | NFR-09 |
| `.env.example` | Lengkap sesuai Bagian 5 | NFR-09 |
| `.github/CODEOWNERS`, `.github/pull_request_template.md` | Pemetaan pemilik (notifikasi) dan checklist PR "hanya menyentuh path milik sendiri" | — |
| `scripts/checkOwnership.mjs` | CI: cabang `pN/*` hanya boleh mengubah path milik PN (kecuali PR scaffold) | — |
| `scripts/evalLeaveOneOut.ts` | Evaluasi galat interpolasi memakai fixture stasiun P2 | M-05, TC-28 |
| `README.md` | Cara menjalankan, env, atribusi data, batasan; dirakit dari `docs/p*-*.md` | FR-15 |
| `src/types/api.ts`, `common.ts`, `aqiScale.ts`, `air-quality.ts`, `geocoding.ts`, `routing.ts`, `preferences.ts`, `algorithms.ts`, `analyze.ts`, `trips.ts`, `schemas.ts` | Kontrak Bagian 3; beku setelah G0 | semua |
| `src/lib/server/apiResponse.ts`, `src/lib/server/withApiHandler.ts` | Pembentuk envelope `{success,data,error,meta}`, pemetaan error → status, pembungkus try/catch dan validasi Zod untuk **semua** handler (beku) | NFR-13 |
| `src/config/parameters.ts` | PAR-01..14 sebagai satu objek `AlgorithmParams` | §9.3 PRD |
| `src/lib/algorithms/geoMath.ts` | `haversineMeters`, panjang lintasan, interpolasi titik di lintasan | ALG-01 |
| `src/lib/algorithms/segmentation.ts` | `splitPath` per PAR-01; segmen terakhir boleh lebih pendek; rute < 500 m = 1 segmen | FR-05, TC-02, TC-26 |
| `src/lib/algorithms/aqiConversion.ts` | `aqiToPm25`, `pm25ToCategory` memakai tabel breakpoint pilihan K-G3; interpolasi linear, *clamp* batas atas, nilai tidak valid → `null`; menyimpan `AQI_BREAKPOINT_VERSION` | FR-04, TC-06 |
| `src/lib/algorithms/interpolation.ts` | ALG-02 IDW: stasiun valid (PM2.5 ada, tidak expired, ≤ PAR-02), K terdekat, jarak < ε → nilai langsung, hasil `{pm25 \| null, stationsUsed, nearestDistanceMeters, uncertaintyClass}` | FR-05, TC-03, TC-04 |
| `src/lib/algorithms/exposure.ts` | ALG-01: Δt proporsional jarak, coverage, rata-rata terbobot waktu, imputasi, EI, 3 kontributor, `contributionPercent` | FR-05, FR-09, TC-01, TC-02, TC-24, TC-25 |
| `src/lib/algorithms/confidence.ts` | Aturan keyakinan High/Medium/Low/unavailable; sumber model membatasi maksimum Medium (BR-08) | TC-07 |
| `src/lib/algorithms/scoring.ts` | ALG-03: himpunan berestimasi, batas waktu **`T_min × (1 + maxExtraTimePercent/100)`**, rasio, skor, tie-break, ambang signifikansi, Pareto | FR-06, TC-08..11 |
| `src/lib/algorithms/explanation.ts` | Merakit teks dan `ExplanationInfo` dari angka yang sama dengan tabel | AC-06.3, TC-32 |
| `src/lib/algorithms/recommendation.ts` | ALG-04 RULE-01..07 (maks 3, urut tingkat keparahan, tanpa diagnosis/dosis) | FR-08, TC-13 |
| `src/lib/algorithms/decide.ts` | `decideRoutes` (isomorfik; tanpa API Node) | FR-06, AC-07.3 |
| `src/lib/algorithms/version.ts` | `ALGORITHM_VERSION` untuk snapshot trip | §11 PRD |
| `src/fixtures/mockAnalysis.ts` | Skenario respons analisis lengkap (normal, tanpa estimasi, satu rute, terdominasi, di luar cakupan, data stale) bertipe `AnalyzeRoutesResponseData`; dibuat **di G0** agar P3/P4 tidak menunggu | FR-06, FR-14 |
| `src/app/page.tsx`, `src/app/page.module.css` | P-01 Beranda | FR-15 |
| `src/app/methodology/page.tsx`, `src/app/methodology/page.module.css` | P-08: definisi (konsentrasi, indikator paparan, dosis, risiko), sumber, rumus ringkas, batasan, atribusi, kebijakan privasi/retensi | FR-15, TC-35 |
| `tests/algorithms/**` | TC-01..04, 06..13, 24, 25, 26a, 28, 32, 35 | |
| `docs/p1-*.md` | Catatan metodologi dan keputusan parameter | |

### 6.2 Spesifikasi kunci
1. **Satuan:** semua waktu internal dalam detik; EI dalam µg/m³·menit (`pm25 × detik / 60`).
2. **Batas waktu:** rute memenuhi batas jika `maxExtraTimePercent === null` atau `durationSeconds ≤ minDuration × (1 + maxExtraTimePercent / 100)`. Rute tercepat selalu memenuhi.
3. **Rasio:** `Tn = T / Tmin`; `En = E / Emin` pada himpunan memenuhi syarat; `Emin = 0` → `En = 1`.
4. **Skor:** `(1 − we)·Tn + we·En`; seri → EI lebih rendah, lalu waktu lebih rendah.
5. **Signifikansi:** selisih EI terhadap tercepat `< significanceThresholdPercent` → tercepat direkomendasikan, `reasonCode = DIFFERENCE_NOT_SIGNIFICANT`.
6. **Tanpa estimasi di semua rute:** `recommendedRouteLabel = null`, `reasonCode = NO_ESTIMATE`.
7. **Waktu "sekarang"** selalu masuk sebagai parameter (`now`), tidak memanggil `Date.now()` di dalam fungsi murni.
8. **Contoh uji wajib:** Rute A 20 menit avg 30 → EI 600; Rute B 23 menit avg 22 → EI 506. `we=0,5` → B; `we=0,2` → A; `maxExtra=10%` → B keluar (23/20 = 1,15).

### 6.3 Dependensi
Masuk: keputusan K-G3 (breakpoint) dan K-G1 sebelum scaffold. Keluar: P2 memanggil `aqiToPm25`, `computeRouteExposure`, `decideRoutes`; P4 memanggil `decideRoutes`, `AQI_CATEGORIES`; P3 memakai `ALGORITHM_VERSION`.

### 6.4 Definisi Selesai
- Gate G0 tercapai: scaffold, kontrak, `mockAnalysis`, dan seluruh stub (Bagian 11) ter-merge; `npm run build` dan `npm test` lulus pada stub.
- Semua TC milik P1 lulus tanpa jaringan. `decide.ts` dan turunannya tidak mengimpor modul Node.
- Teks rekomendasi tidak memuat diagnosis, penyakit, atau dosis (AC-08.2 teruji otomatis).

### 6.5 [KONFIRMASI] sebelum mengerjakan
| ID | Pertanyaan | Default sementara | Penentu |
|---|---|---|---|
| K-P1.1 | Skala dan versi breakpoint PM2.5 yang dipakai? Setahu saya EPA merevisi breakpoint PM2.5 pada 2024; **belum saya verifikasi** dan harus diselaraskan dengan skala yang dipakai WAQI | US-EPA; versi dicatat di `AQI_BREAKPOINT_VERSION` | Tim (K-G3) |
| K-P1.2 | Teks rekomendasi kesehatan (RULE-01..07): sumber panduan resmi mana (OQ-06)? | Redaksi netral non-klinis dari PRD §9.7 + disclaimer | Tim |
| K-P1.3 | Nilai awal PAR-01..14 dan bobot preset 0 / 0,5 / 0,8 diterima sebagai asumsi awal? | Ya, tampil sebagai "asumsi awal" di metodologi | Tim |
| K-P1.4 | Kecepatan homogen sepanjang rute (Δt proporsional jarak) diterima sebagai batasan yang dinyatakan di metodologi? | Ya | Tim |
| K-P1.5 | Jarak antar titik: Haversine (bukan Euclidean datar) | Haversine | P1 (informasi) |
| K-P1.6 | Pustaka polyline dan versi Next.js untuk scaffold | `@mapbox/polyline`; Next versi stabil terbaru | Tim (K-G1) |

---

## 7. PERSON 2 — Integrasi API Eksternal dan Backend Analisis

**Peran:** semua komunikasi ke penyedia eksternal, normalisasi, cache, mode simulasi, dan endpoint analisis yang merangkai rute + stasiun + algoritma P1.

### 7.1 File yang dimiliki
| Path | Tanggung jawab | Ref |
|---|---|---|
| `src/config/constants.ts` | Bbox dan pusat kota pilot, zoom awal, timeout PAR-13, batas panggilan detail stasiun per analisis, jarak minimum asal-tujuan (100 m) | FR-02, FR-03 |
| `src/fixtures/mockStations.ts`, `mockRoutes.ts`, `mockGeocode.ts` | Rekaman respons **nyata** (setelah spike S1–S3) yang sudah dinormalisasi; dipakai mode simulasi | NFR-04, BR-02 |
| `src/lib/utils/cache.ts` | Cache TTL in-memory (best-effort di serverless) | PAR-12 |
| `src/lib/utils/fetchWithTimeout.ts` | `fetch` dengan timeout dan 1× retry untuk error jaringan/5xx | NFR-06 |
| `src/lib/services/geocodingService.ts` | Panggil geocoder (Nominatim), header `User-Agent` identitas, batasi ke area kota pilot, maks 5 kandidat, set `withinPilotArea`, cache 24 jam | FR-02 |
| `src/lib/services/routingService.ts` | Panggil routing, **konversi `[lng,lat]` → `[lat,lng]`**, jarak < 100 m → `VALIDATION_ERROR`, tanpa rute → `NO_ROUTE_FOUND` | FR-03 |
| `src/lib/services/routeCandidates.ts` | Buang duplikat (tumpang tindih > PAR-10), urut durasi, maks 3, label A/B/C, `isFastest`; utilitas jarak sendiri (tidak mengimpor P1) | AC-03.1..03.3 |
| `src/lib/services/airQualityService.ts` | Orkestrasi sumber: WAQI → fallback Open-Meteo (`model_fallback`) → cache → "tidak tersedia"; mode simulasi | FR-04, FR-14 |
| `src/lib/services/waqiAdapter.ts` | Adapter WAQI (bentuk akhir ditentukan spike S1) | FR-04 |
| `src/lib/services/openMeteoAdapter.ts` | Adapter fallback model berlabel (FR-17, bila diputuskan K-P2.4) | FR-17 |
| `src/lib/services/normalizeStation.ts` | Petakan ke `StationData`; field hilang → `null`; `ageMinutes` dan `freshness` (fresh ≤ 3 j, stale ≤ 24 j, expired > 24 j; tanpa waktu → expired); waktu → UTC; memakai `aqiToPm25` (P1) dan mengisi `pm25Origin` | AC-04.1, AC-04.2, TC-05 |
| `src/lib/services/pipelineService.ts` | Alur analisis: validasi → cek area → routing → bbox rute + margin PAR-02 → stasiun → `computeRouteExposure` per rute → `decideRoutes` → rakit `AnalyzeRoutesResponseData` (warnings, dataSources, disclaimer) | FR-03..09 |
| `src/app/api/air-quality/stations/route.ts` | API-01 `GET` | FR-01 |
| `src/app/api/geocode/route.ts` | API-02 `GET` | FR-02 |
| `src/app/api/routes/analyze/route.ts` | API-04 `POST`; set batas durasi fungsi sesuai hosting | FR-03..09 |
| `tests/services/**` | TC-05, 14, 15, 16, 17, 24b, 25b, 26b, 29 | |
| `docs/p2-api-verification.md` | Hasil spike: skema respons aktual, kuota, atribusi, kebijakan penggunaan, cakupan kota pilot | OQ-03 |

### 7.2 Spike verifikasi (dikerjakan **sebelum** adapter dikunci)
| ID | Spike | Hasil yang dicatat |
|---|---|---|
| S1 | WAQI: panggil endpoint daftar stasiun per bbox **dan** endpoint detail per stasiun. Dari ingatan saya, endpoint bbox hanya memberi AQI keseluruhan (bukan PM2.5 per polutan) dan nilai per polutan perlu panggilan detail per stasiun — **belum diverifikasi** | Endpoint dan path yang benar, field yang tersedia, apakah PM2.5 tersedia di kota pilot, kuota, atribusi |
| S2 | Routing: OSRM demo vs ORS — jumlah alternatif, urutan koordinat, durasi respons, kebijakan penggunaan | Pilihan provider (K-P2.2) |
| S3 | Nominatim: kebijakan penggunaan, pembatasan area (viewbox), latensi | Parameter pemanggilan |
| S4 | Open-Meteo Air Quality: variabel PM2.5/PM10, resolusi, syarat penggunaan | Layak sebagai fallback atau tidak |

Jika S1 membuktikan PM2.5 hanya tersedia lewat panggilan per stasiun, `pipelineService` memilih hanya **N stasiun terdekat ke rute** (batas di `constants.ts`) untuk panggilan detail, dan hasilnya di-cache.

### 7.3 Aturan perilaku
- Semua handler memakai `withApiHandler` (P1). Token tidak pernah masuk respons atau bundel klien (AC-04.3).
- Titik di luar bbox kota pilot: lanjut routing, `estimate` tidak tersedia, warning `OUTSIDE_COVERAGE` (D5).
- Tidak ada log koordinat; log hanya status, durasi, kode error (SEC-11).
- `DATA_MODE=simulation`: tidak ada panggilan eksternal; semua respons berwarning `SIMULATION_DATA`.
- Matriks FR-14 diimplementasikan di `pipelineService` dan `airQualityService`.

### 7.4 Definisi Selesai
- Tiga handler dapat dipanggil via curl dengan envelope standar dalam mode `live` dan `simulation`.
- Seluruh baris matriks FR-14 teruji (TC-14..17, 24b, 25b, 26b).
- p95 `POST /api/routes/analyze` terukur dan dilaporkan (TC-29).
- `docs/p2-api-verification.md` terisi; semua "diduga/TBD" pada PRD §8.2 dikonfirmasi atau dikoreksi.

### 7.5 [KONFIRMASI] sebelum mengerjakan
| ID | Pertanyaan | Default sementara | Penentu |
|---|---|---|---|
| K-P2.1 | Kota pilot dan bbox presisi (OQ-02) — kota dengan stasiun PM2.5 aktif di WAQI | Ditentukan setelah S1 | Tim |
| K-P2.2 | Routing: OSRM demo atau ORS (OQ-04)? Siapa mendaftar key ORS? | OSRM demo dulu; ORS bila alternatif tidak memadai | P2 + tim |
| K-P2.3 | Siapa pemilik token WAQI dan bagaimana dibagikan ke anggota (tanpa commit ke repo)? | Satu pemilik; berbagi lewat penyimpanan rahasia hosting + `.env` lokal | Tim |
| K-P2.4 | Fallback Open-Meteo (FR-17) dikerjakan? (OQ-07) | Ya, setelah adapter WAQI stabil | Tim |
| K-P2.5 | Titik di luar kota pilot: lanjut routing tanpa estimasi (D5) atau ditolak? | Lanjut tanpa estimasi + warning | Tim |
| K-P2.6 | Isi `User-Agent` geocoder (nama aplikasi + kontak) | `EcoPulse/1.0 (<email tim>)` | Tim |
| K-P2.7 | Cache in-memory tidak bertahan antar invocation serverless; cukup *best-effort* atau pakai cache fetch bawaan Next / penyimpanan eksternal gratis? Batas durasi fungsi tier gratis juga **harus diverifikasi** | Best-effort + `revalidate` fetch | P2 + tim |
| K-P2.8 | Batas jumlah panggilan detail stasiun per analisis (bergantung kuota hasil S1) | TBD setelah S1 | P2 |

---

## 8. PERSON 3 — Autentikasi, Database, Riwayat, Pengaturan, dan Peta Udara (P-02)

**Peran:** semua yang berkaitan dengan pengguna terdaftar dan data pribadi, ditambah halaman Peta Kualitas Udara.

### 8.1 File yang dimiliki
| Path | Tanggung jawab | Ref |
|---|---|---|
| `supabase/migrations/001_initial_schema.sql` | DDL Bagian 4: `profiles`, `trips`, trigger profil, indeks, RLS | FR-10, FR-11, FR-13 |
| `supabase/seed.sql` | Data contoh opsional | — |
| `src/types/database.ts` | Tipe baris DB (di luar kontrak beku; tidak diimpor kontrak) | — |
| `src/middleware.ts` | Segarkan sesi; redirect ke `/login` untuk `/history` dan `/settings` bila tanpa sesi | SEC-03 |
| `src/lib/supabase/client.ts`, `server.ts`, `admin.ts` | Klien browser, klien server (cookie), klien admin (service role, server only) | SEC-07 |
| `src/lib/trips/tripMapper.ts` | `TripSavePayload` ↔ baris DB; encode/decode polyline; `snake_case` ↔ `camelCase` | FR-11 |
| `src/lib/trips/tripService.ts` | Simpan (atomik), daftar terpaginasi, detail, hapus satu/semua | FR-11, FR-13 |
| `src/lib/trips/summaryService.ts` | Ringkasan 7/30 hari (Could) | FR-12 |
| `src/lib/client/tripsApi.ts` | `saveTrip`, `listTrips`, `getTrip`, `deleteTrip`, `deleteAllTrips` | FR-11 |
| `src/lib/client/preferencesApi.ts` | `getPreferences`, `updatePreferences` | FR-07 |
| `src/lib/client/accountApi.ts` | `updateConsent`, `deleteAccount` | FR-13 |
| `src/lib/client/auth/useAuthUser.ts`, `authActions.ts` | Hook status login; `signUp`, `signIn`, `signOut` | FR-10 |
| `src/app/login/page.tsx` | P-04 (mode masuk dan daftar) | FR-10 |
| `src/app/history/page.tsx` | P-05 daftar riwayat (+ ringkasan bila FR-12 dikerjakan) | FR-11 |
| `src/app/history/[id]/page.tsx` | P-06 detail snapshot | FR-09, FR-11 |
| `src/app/settings/page.tsx` | P-07 preferensi, persetujuan, hapus data/akun | FR-07, FR-13 |
| `src/app/map/page.tsx`, `src/app/map/page.module.css` | P-02 Peta Kualitas Udara (merangkai komponen peta P4 dan panel P3) | FR-01 |
| `src/app/api/trips/route.ts` | `GET` daftar, `POST` simpan, `DELETE` semua (API-05, API-06) | FR-11 |
| `src/app/api/trips/[id]/route.ts` | `GET`, `DELETE` satu | FR-11 |
| `src/app/api/preferences/route.ts` | `GET`, `PUT` (API-07) | FR-07 |
| `src/app/api/account/consent/route.ts` | `PATCH` (API-08) | FR-13 |
| `src/app/api/account/route.ts` | `DELETE` dengan konfirmasi kata sandi (API-08) | FR-13 |
| `src/app/api/exposure/summary/route.ts` | `GET` ringkasan (Could, API-09) | FR-12 |
| `src/components/auth/LoginForm.tsx`, `RegisterForm.tsx` | Form dengan validasi `schemas.ts` | AC-10.4 |
| `src/components/history/HistoryCard.tsx`, `ConsentDialog.tsx`, `TripDetailView.tsx`, `SummaryCards.tsx` | Kartu riwayat; dialog persetujuan (dipakai P4 lewat stub); tampilan detail (memakai komponen peta dan panel detail P4); kartu ringkasan (Could) | FR-11, FR-12 |
| `src/components/settings/DeleteAccountPanel.tsx` | Konfirmasi kata sandi sebelum hapus akun | FR-13 |
| `src/components/air-map/StationDetailPanel.tsx`, `useStations.ts` | Panel detail stasiun (nama, AQI, polutan, `observedAt`, usia, kesegaran, sumber, label tipe data) dan hook pemuatan stasiun per viewport | AC-01.2, AC-01.3 |
| `tests/database/**` | TC-18, 19, 20, 21b, 22, 23, 33, 34 | |
| `docs/p3-*.md` | Catatan RLS, alur persetujuan, uji manual P-02 | |

### 8.2 Aturan perilaku
1. **Simpan trip:** autentikasi → cek `history_consent` (false → `403 CONSENT_REQUIRED`) → validasi Zod → simpan atomik. Perjalanan tanpa estimasi boleh disimpan (ditandai).
2. **Isolasi:** semua query memakai sesi pengguna dengan RLS; `user_id` tidak pernah dibaca dari body/URL. `tripId` milik orang lain → `404 NOT_FOUND`.
3. **Hapus akun:** verifikasi kata sandi → klien admin menghapus `auth.users` (cascade `profiles`, `trips`) → sesi dicabut. Service role hanya dipakai di file ini.
4. **Kata sandi:** ≥ 8 karakter, huruf dan angka, divalidasi client dan server; pesan gagal login generik (AC-10.2).
5. **P-02:** memuat stasiun saat peta berhenti bergerak (bukan tiap piksel geser), menampilkan kosong/error/cache sesuai AC-01.4, dan label tipe data (BR-01).
6. **Retensi 90 hari:** dinyatakan di halaman Metodologi/Pengaturan; penghapusan otomatis adalah Could (K-P3.6).

### 8.3 Definisi Selesai
- Alur daftar → masuk → simpan → riwayat → detail → hapus akun berjalan end-to-end.
- RLS terbukti (TC-22): pengguna A tidak dapat membaca atau menghapus data B, termasuk lewat panggilan API langsung.
- P-02 menampilkan stasiun nyata dalam mode `live` dan fixture dalam `simulation` dengan banner.
- `SUPABASE_SERVICE_ROLE_KEY` tidak muncul di bundel klien (periksa hasil build).

### 8.4 [KONFIRMASI] sebelum mengerjakan
| ID | Pertanyaan | Default sementara | Penentu |
|---|---|---|---|
| K-P3.1 | Siapa pemilik proyek Supabase dan bagaimana kunci dibagikan? "Confirm email" dimatikan (ASM-09)? | Satu pemilik, anggota lain diundang; confirm email dimatikan | Tim |
| K-P3.2 | Penghapusan akun lewat klien admin (service role) di server, dengan konfirmasi kata sandi | Ya | P3 |
| K-P3.3 | Cara menguji RLS: Supabase CLI lokal (butuh Docker) atau proyek Supabase uji terpisah? | Proyek uji terpisah | P3 + tim |
| K-P3.4 | Halaman P-02 ditempatkan di P3 (pembagian beban) — setuju? | Ya | Tim |
| K-P3.5 | Server menyimpan snapshot estimasi kiriman klien tanpa menghitung ulang (data milik pengguna sendiri); atau recompute di server? | Simpan snapshot + validasi bentuk | Tim |
| K-P3.6 | FR-12 (ringkasan 7/30 hari) dan retensi otomatis 90 hari dikerjakan sekarang atau dicatat sebagai pengembangan lanjutan? | Dikerjakan setelah alur inti P3 selesai | Tim |
| K-P3.7 | Perlu akun demo untuk juri/penilai? | Ya, dibuat manual, bukan dari seed | Tim |
| K-P3.8 | Konvensi middleware/proxy mengikuti versi Next.js yang dipilih saat scaffold | Ikuti versi terpasang | P3 |

---

## 9. PERSON 4 — Sistem Desain, Primitif Peta, dan Perencana Rute

**Peran:** identitas visual, layout, komponen umum, peta, dan seluruh alur P-03 (cari → analisis → bandingkan → rekomendasi → simpan).

### 9.1 File yang dimiliki
| Path | Tanggung jawab | Ref |
|---|---|---|
| `src/app/globals.css` | Token (warna kategori dari `AQI_CATEGORIES`, spasi, tipografi); **satu-satunya** CSS global | NFR-14 |
| `src/app/layout.tsx` | Shell, font, `AppHeader`, `AppFooter`, banner mode data | FR-14 |
| `src/components/layout/AppHeader.tsx`, `AppFooter.tsx` | Navigasi (memakai `useAuthUser` P3), atribusi OSM/WAQI/Nominatim | AC-15.2 |
| `src/components/common/Button.tsx`, `Card.tsx`, `Badge.tsx`, `Modal.tsx`, `DisclaimerBanner.tsx`, `DataTypeLabel.tsx`, `ConfidenceBadge.tsx`, `AqiBadge.tsx`, `LoadingState.tsx`, `EmptyState.tsx`, `ErrorState.tsx` | Komponen umum; `DataTypeLabel` menerapkan BR-01; warna selalu disertai label teks | BR-01, NFR-14 |
| `src/components/map/MapContainer.tsx` | Pembungkus dinamis tanpa SSR | FR-01 |
| `src/components/map/LeafletInnerMap.tsx` | Instance Leaflet, tile OSM, atribusi | FR-01 |
| `src/components/map/StationMarkers.tsx` | Marker berwarna menurut kategori; stasiun expired abu-abu | AC-01.1, AC-01.3 |
| `src/components/map/RoutePolylines.tsx` | Garis rute A/B/C dengan label sama dengan tabel; pewarnaan segmen menurut kategori | AC-09.x |
| `src/components/map/MapLegend.tsx`, `LocationPickerLayer.tsx` | Legenda; pemilihan titik via toggle "Pilih Asal"/"Pilih Tujuan" | FR-02 |
| `src/components/route-planner/SearchBox.tsx` | Input asal/tujuan, pencarian saat tombol/Enter (bukan autocomplete), daftar kandidat | FR-02 |
| `src/components/route-planner/PreferenceSlider.tsx` | Preset (0 / 0,5 / 0,8), slider, batas waktu tambahan dalam **persen**; juga dipakai P3 di Pengaturan | FR-07 |
| `src/components/route-planner/RouteCompareTable.tsx` | Tabel A/B/C: waktu, jarak, EI, selisih vs tercepat, keyakinan, penanda terdominasi | FR-06 |
| `src/components/route-planner/RecommendationCard.tsx` | Rute rekomendasi + teks alasan dari `ExplanationInfo` | AC-06.3 |
| `src/components/route-planner/ActionMessagesPanel.tsx` | Maks 3 pesan tindakan + dasar + tautan metodologi | FR-08 |
| `src/components/route-planner/ExposureDetailModal.tsx` | 3 kontributor, stasiun dipakai, keyakinan, label "estimasi — bukan dosis"; dipakai juga di detail riwayat (P3) | FR-09 |
| `src/components/route-planner/WarningList.tsx` | Menampilkan `ApiWarning[]` menurut matriks FR-14 | FR-14 |
| `src/components/route-planner/AnalysisProgress.tsx` | Status bertahap saat analisis | UJ-02 |
| `src/components/route-planner/SaveTripButton.tsx` | Memanggil `tripsApi.saveTrip` (P3); bila belum login → arahkan ke `/login`; bila belum setuju → `ConsentDialog` (P3) | FR-11 |
| `src/app/routes/page.tsx`, `src/app/routes/page.module.css` | P-03 | FR-02..09 |
| `src/lib/client/analyzeApi.ts`, `geocodeApi.ts` | Pembungkus `fetch` bertipe; mode fixture `NEXT_PUBLIC_USE_FIXTURES=true` memakai `mockAnalysis` | NFR-13 |
| `src/lib/client/hooks/useRoutePlanner.ts` | State perencana: titik, hasil, status; menghitung ulang dengan `decideRoutes` saat preferensi berubah | AC-07.3 |
| `src/lib/client/preferenceSession.ts` | Preferensi pengunjung di `sessionStorage` (dibungkus try/catch) | FR-07 |
| `tests/ui/**` | TC-21a, 27 (panduan uji), 32b | |
| `docs/p4-*.md` | Catatan desain, skrip uji usability | |

### 9.2 Aturan perilaku
1. **Konsistensi (PRD §10.3):** warna kategori hanya dari `AQI_CATEGORIES`; label A/B/C sama di peta/tabel/teks; satuan dan pembulatan seragam (µg/m³ satu desimal; µg/m³·menit bulat; menit); waktu observasi ditampilkan di zona waktu perangkat dengan zona eksplisit.
2. **Angka tunggal:** teks alasan dan tabel membaca dari objek `DecisionResult` yang sama; tidak ada perhitungan angka di komponen.
3. **Hitung ulang:** perubahan preferensi memanggil `decideRoutes` di klien; routing dan estimasi tidak dipanggil ulang (D6). Perubahan asal/tujuan memanggil API.
4. **Status:** loading bertahap, kosong (petunjuk 3 langkah), error per matriks FR-14; peta tetap dapat dipakai saat error.
5. **Peringatan area:** titik di luar bbox kota pilot diperingatkan di sisi klien sebelum analisis (AC-02.3) memakai `constants.ts` (P2) dan ditegaskan lagi oleh `warnings` server.
6. **Aksesibilitas:** kontras memadai, tidak bergantung warna saja, label form terkait input, navigasi keyboard, responsif ≥ 360 px.
7. **Leaflet:** tidak diimpor di sisi server; CSS Leaflet diimpor di `LeafletInnerMap.tsx`.

### 9.3 Definisi Selesai
- Alur P-03 lengkap berjalan terhadap endpoint nyata (mode `live` dan `simulation`) tanpa error konsol (TC-33 versi P-03).
- Mengubah slider tidak memicu panggilan jaringan (AC-07.3 teruji manual).
- Semua skenario di `mockAnalysis` (normal, tanpa estimasi, satu rute, terdominasi, di luar cakupan, stale) tampil benar.
- Tata letak berfungsi pada lebar 360 px.

### 9.4 [KONFIRMASI] sebelum mengerjakan
| ID | Pertanyaan | Default sementara | Penentu |
|---|---|---|---|
| K-P4.1 | UX pemilihan titik di peta: toggle "Pilih Asal"/"Pilih Tujuan" (ramah mobile) atau klik kiri/kanan? | Toggle | P4 |
| K-P4.2 | Tile OSM publik cukup untuk demo, atau pakai penyedia tile lain? Atribusi di pojok peta dan footer | OSM publik + atribusi | Tim |
| K-P4.3 | Hitung ulang preferensi di klien (`decideRoutes`) atau panggil API lagi? | Klien (D6) | Tim |
| K-P4.4 | Arah visual: ada logo, palet, atau referensi desain? Mode gelap? | Palet kategori dari kontrak; mode terang dulu | Tim |
| K-P4.5 | Fitur "gunakan lokasi saya" (geolokasi) — di luar PRD; ditambahkan? | Tidak (privasi, di luar lingkup) | Tim |
| K-P4.6 | Font eksternal (mis. Google Fonts) diperbolehkan atau memakai font sistem? | Font sistem | P4 |
| K-P4.7 | Nama rute/komponen yang dipakai P3 (`ExposureDetailModal`, `RoutePolylines`) cukup dengan props bertipe dari kontrak? | Ya, props = tipe `algorithms.ts` | P3 + P4 |

---

## 10. REST API Contract

Semua respons memakai envelope `ApiResponse<T>`. Semua handler dibungkus `withApiHandler` (P1).

| ID | Method & Path | Auth | Request | Respons `data` | Status | Pemilik |
|---|---|---|---|---|---|---|
| API-01 | `GET /api/air-quality/stations` | publik | query `south,west,north,east` | `StationsPayload` | 200, 400, 502/504 | P2 |
| API-02 | `GET /api/geocode` | publik | query `q` (3–100 karakter) | `GeocodePayload` | 200, 400, 429, 504 | P2 |
| API-04 | `POST /api/routes/analyze` | publik | `AnalyzeRoutesRequest` | `AnalyzeRoutesResponseData` | 200, 400, 422 `NO_ROUTE_FOUND`, 502/504 | P2 |
| API-05a | `GET /api/trips` | sesi | query `page,pageSize` | `TripListItem[]` + `meta.total` | 200, 401 | P3 |
| API-05b | `GET /api/trips/[id]` | sesi | — | `TripDetail` | 200, 401, 404 | P3 |
| API-05c | `DELETE /api/trips/[id]` | sesi | — | `{deleted: true}` | 200, 401, 404 | P3 |
| API-05d | `DELETE /api/trips` | sesi | — | `{deletedCount}` | 200, 401 | P3 |
| API-06 | `POST /api/trips` | sesi | `TripSavePayload` | `{tripId}` | 201, 400, 401, 403 `CONSENT_REQUIRED` | P3 |
| API-07a | `GET /api/preferences` | sesi | — | `PreferencesPayload` | 200, 401 | P3 |
| API-07b | `PUT /api/preferences` | sesi | `RoutePreferences` | `PreferencesPayload` | 200, 400, 401 | P3 |
| API-08a | `PATCH /api/account/consent` | sesi | `{historyConsent}` | `{historyConsent}` | 200, 400, 401 | P3 |
| API-08b | `DELETE /api/account` | sesi | `{password}` | `{deleted: true}` | 200, 400, 401, 403 | P3 |
| API-09 | `GET /api/exposure/summary` | sesi | query `range=7d\|30d` | ringkasan (Could) | 200, 401 | P3 |

Aturan umum: pesan error berbahasa Indonesia tanpa stack trace; kode status sesuai `ErrorCode`; endpoint `sesi` tanpa sesi → `401 UNAUTHENTICATED`.

---

## 11. Scaffold G0 dan Daftar Stub

P1 membuat satu commit/PR scaffold yang berisi: konfigurasi proyek, `src/types/**`, `src/lib/server/**`, `mockAnalysis`, serta **stub yang valid** (kompilasi dan mengembalikan fixture) untuk setiap titik impor lintas pemilik. Setelah PR ini ter-merge, tiap stub menjadi milik pemilik direktorinya dan boleh ditimpa tanpa kompromi.

| Stub | Pemilik setelah G0 | Dipakai oleh | Perilaku stub |
|---|---|---|---|
| `src/lib/algorithms/*` (semua fungsi Bagian 3.8) | P1 | P2, P4 | Mengembalikan skenario `mockAnalysis` |
| `src/config/constants.ts` | P2 | P3, P4 | Bbox dan pusat kota sementara |
| `src/lib/services/pipelineService.ts` + tiga handler P2 | P2 | P4 | Mengembalikan `mockAnalysis` / stasiun contoh |
| `src/components/common/*`, `components/map/*`, `components/route-planner/PreferenceSlider.tsx`, `ExposureDetailModal.tsx` | P4 | P3 | Komponen sederhana dengan props final |
| `src/components/history/ConsentDialog.tsx` | P3 | P4 | Dialog sederhana dengan props final |
| `src/lib/client/auth/useAuthUser.ts`, `tripsApi.ts`, `preferencesApi.ts` | P3 | P4 | Hook/fungsi dengan tipe final, data contoh |

Props dan tanda tangan fungsi pada stub adalah **bagian dari kontrak**; perubahan memakai protokol 12.3.

---

## 12. Alur Kerja Git dan Gate Integrasi

### 12.1 Cabang dan PR
- `main` dilindungi. Cabang kerja: `p1/<topik>`, `p2/<topik>`, `p3/<topik>`, `p4/<topik>`.
- Sebelum G0: hanya P1 yang melakukan commit ke repositori; anggota lain mengerjakan **spike, keputusan, dan akun layanan** (bukan kode di repositori).
- Setelah G0: PR **kecil dan sering** ke `main` (satu fitur per PR). Rebase ke `main` sebelum PR; `--force-with-lease` hanya pada cabang sendiri.
- CI: `lint`, `typecheck`, `test`, dan `scripts/checkOwnership.mjs` (menolak PR yang menyentuh path pemilik lain).
- Review silang bergilir: P1↔P2, P3↔P4 (memeriksa kepatuhan kontrak). CODEOWNERS hanya untuk notifikasi.

### 12.2 Gate (berbasis dependensi)
| Gate | Syarat lulus | Membuka |
|---|---|---|
| **G0** Fondasi | Keputusan K-G1..K-G5 diambil; scaffold, kontrak, `mockAnalysis`, dan stub ter-merge; `build` dan `test` lulus | Semua pengerjaan kode |
| **G1** Modul mandiri | Tiap orang lulus tes modulnya dengan fixture/stub: P1 (TC algoritma), P2 (adapter terhadap fixture, hasil spike S1–S4), P3 (skema + RLS), P4 (UI atas `mockAnalysis`) | G2 |
| **G2** Pipeline nyata | P2 mengganti stub dengan `pipelineService` yang memanggil algoritma P1; analyze berfungsi di `simulation` lalu `live` | P4 beralih dari fixture ke endpoint nyata |
| **G3** Perencana rute | P-03 berjalan terhadap analyze nyata (preferensi, hitung ulang di klien, error/warning) | G4 |
| **G4** Akun dan riwayat | Simpan trip dari P-03 → riwayat → detail → hapus; RLS lulus | G5 |
| **G5** Pengerasan | Seluruh matriks FR-14 dan semua TC wajib lulus; metodologi dan atribusi lengkap; build produksi; evaluasi estimasi (TC-28) dilaporkan | Rilis |

### 12.3 Protokol perubahan kontrak
1. Buka Issue berlabel `contract` berisi alasan dan diff tipe.
2. Perubahan hanya **aditif** (field opsional baru). Mengubah atau menghapus field memerlukan persetujuan keempat orang.
3. P1 menerapkan perubahan dalam satu PR kecil; konsumen menyesuaikan setelah merge.

### 12.4 Aturan pencegah konflik
1. Tidak menambah dependensi sendiri; ajukan Issue `request:p1` (hanya P1 yang mengubah `package.json` dan lockfile).
2. Tidak menambah variabel env sendiri; semua sudah ada di `.env.example`.
3. Tidak membuat file di folder pemilik lain, termasuk stub; gunakan stub yang sudah ada.
4. Tidak menulis CSS global; gunakan `*.module.css`.
5. Tidak menduplikasi tipe; impor dari `src/types/`.
6. Tidak memformat ulang file yang tidak diubah (Prettier berjalan pada file sendiri).

---

## 13. Data Dictionary

### Tabel `profiles`
| Kolom DB | Tipe DB | Properti TS/JSON | Elemen UI |
|---|---|---|---|
| `user_id` | uuid | `userId` | — |
| `exposure_weight` | numeric(3,2) | `exposureWeight` | `exposureWeightSlider` |
| `max_extra_time_percent` | smallint (null = tanpa batas) | `maxExtraTimePercent` | `maxExtraTimeInput`, `noTimeLimitToggle` |
| `history_consent` | boolean | `historyConsent` | `historyConsentToggle` |
| `consent_updated_at` | timestamptz | `consentUpdatedAt` | — |

### Tabel `trips`
| Kolom DB | Properti TS/JSON | Elemen UI |
|---|---|---|
| `trip_id` | `tripId` | `data-trip-id` |
| `origin_label`, `destination_label` | `originLabel`, `destinationLabel` | `originInput`, `destinationInput` |
| `origin_lat/lng`, `destination_lat/lng` | `origin.lat/lng`, `destination.lat/lng` | — |
| `route_polyline` | `geometry` (di-decode server) | `RoutePolylines` |
| `distance_m`, `duration_s` | `distanceMeters`, `durationSeconds` | `distanceCell`, `durationCell` |
| `analyzed_at` | `analyzedAt` | `analyzedAtLabel` |
| `exposure_index_pm25` | `exposureIndexPm25` | `exposureIndexCell` |
| `avg_pm25` | `avgPm25` | `avgPm25Cell` |
| `aqi_category` | `category` (`AqiCategoryCode`) | `aqiBadge` |
| `confidence_level` | `confidenceLevel` | `confidenceBadge` |
| `coverage_ratio` | `coverageRatio` | `coverageLabel` |
| `data_source` | `dataSource` | `dataSourceLabel` |
| `fastest_duration_s`, `fastest_exposure_index_pm25` | `fastest.durationSeconds`, `fastest.exposureIndexPm25` | `fastestBaselineLabel` |
| `was_recommended` | `wasRecommended` | `recommendedBadge` |
| `used_exposure_weight` | `usedExposureWeight` | — |
| `estimate_details` | `estimate` (`RouteExposureEstimate`) | `ExposureDetailModal` |
| `algorithm_version` | `algorithmVersion` | — |

Kontrak tipe dan nilai default selalu mengikuti `src/types/`; tabel ini hanya pemetaan nama.

---

## 14. Pemetaan Test Case ke Pemilik

| TC | Pemilik | Lokasi |
|---|---|---|
| TC-01, 02, 03, 04, 07 | P1 | `tests/algorithms/` |
| TC-05 (kesegaran) | P2 | `tests/services/` |
| TC-06 (konversi AQI) | P1 | `tests/algorithms/` |
| TC-08, 09, 10, 11, 12, 13 | P1 | `tests/algorithms/` |
| TC-14, 15, 16 | P2 | `tests/services/` |
| TC-17 | P2 | `tests/services/` |
| TC-18, 19, 20 | P3 | `tests/database/` |
| TC-21 (validasi): 21a form pencarian/preferensi | P4 | `tests/ui/` |
| TC-21 (validasi): 21b login/registrasi | P3 | `tests/database/` |
| TC-22, 23 | P3 | `tests/database/` |
| TC-24, 25: unit pada `exposure` (P1) dan lintas pipeline (P2) | P1 + P2 | masing-masing folder |
| TC-26: 26a segmentasi rute pendek (P1); 26b validasi routing, tukar lat/lng (P2) | P1 + P2 | masing-masing folder |
| TC-27 (usability) | P4 mengoordinasi, semua ikut | `docs/p4-*.md` |
| TC-28 (evaluasi interpolasi) | P1 (data dari fixture P2) | `scripts/` |
| TC-29 (performa) | P2 | `tests/services/` |
| TC-32 (konsistensi angka): unit (P1), render UI (P4) | P1 + P4 | masing-masing folder |
| TC-33 (peta udara) | P3 | uji manual terdokumentasi |
| TC-34 (ringkasan, Could) | P3 | `tests/database/` |
| TC-35 (metodologi) | P1 | checklist di `docs/p1-*.md` |

---

## 15. Keterlacakan File → Requirement

| Kelompok file | FR | US | AC utama |
|---|---|---|---|
| P1 `algorithms/*`, `mockAnalysis` | FR-05, 06, 08, 09 | US-05, 06, 08 | AC-05.x, 06.x, 08.x, 09.1 |
| P1 `app/page.tsx`, `methodology` | FR-15 | US-13 | AC-15.1..15.3 |
| P2 `airQualityService`, `normalizeStation`, adapters | FR-04, 14, 17 | US-02, 12 | AC-04.1..04.5, 14.x |
| P2 `geocodingService`, `routingService`, `routeCandidates` | FR-02, 03 | US-03, 04 | AC-02.x, 03.x |
| P2 `pipelineService`, tiga handler | FR-01, 03..09, 14 | US-01, 04..06, 12 | AC-14.1..14.3 |
| P3 auth, middleware, supabase | FR-10 | US-09, 14 | AC-10.1..10.4 |
| P3 trips, riwayat, detail | FR-11, 09 | US-10, 14 | AC-11.1..11.4 |
| P3 settings, account | FR-07, 13 | US-07, 11 | AC-07.2, 13.1..13.3 |
| P3 `map/page`, `air-map/*` | FR-01 | US-01, 02 | AC-01.1..01.4 |
| P4 `route-planner/*`, `routes/page` | FR-02, 06, 07, 08, 09, 14 | US-03..08, 12 | AC-02.3, 06.x, 07.x, 08.1, 09.x |
| P4 `common/*`, `layout`, `globals.css` | FR-14, 15 | US-12 | AC-14.3, 15.2 |

---

## 16. Rekap Konfirmasi Tim (Gate G0)

| ID | Pertanyaan | Default | Pemutus | Status |
|---|---|---|---|---|
| K-G1 | TypeScript + Next.js (versi apa) dan package manager | TS strict, Next stabil terbaru, npm | Tim | [ ] |
| K-G2 | Styling: CSS Modules (tanpa Tailwind) | CSS Modules | Tim | [ ] |
| K-G3 | Skala dan versi breakpoint AQI PM2.5 | US-EPA; versi dicatat | Tim | [ ] |
| K-G4 | Repositori (GitHub), nama cabang `main`, aturan perlindungan, akun anggota | — | Tim | [ ] |
| K-G5 | Penugasan nama anggota ke P1–P4 (sesuai kemampuan: P1 logika/matematika + scaffold, P2 backend/API, P3 database/auth, P4 frontend/peta) | — | Tim | [ ] |
| K-G6 | Aturan hackathon: batasan teknologi dan format pengumpulan (OQ-01) — tidak memengaruhi urutan kerja, tetapi dapat memengaruhi stack | — | Tim | [ ] |
| K-P2.1 | Kota pilot dan bbox (setelah spike S1) | — | Tim | [ ] |
| K-P2.3 | Pemilik dan cara berbagi token WAQI | — | Tim | [ ] |
| K-P3.1 | Pemilik proyek Supabase dan cara berbagi kunci | — | Tim | [ ] |
| K-P1.2 | Sumber teks rekomendasi kesehatan (OQ-06) | Redaksi netral PRD | Tim | [ ] |

Keputusan lain (K-P*.* pada Bagian 6–9) dijawab oleh pemilik tugas dan dicatat di `docs/p*-*.md`.

---

## 17. Catatan Batasan Spesifikasi
- Detail respons WAQI, OSRM/ORS, Nominatim, dan Open-Meteo, termasuk kuota dan kebijakan penggunaan, **belum diverifikasi**; spike S1–S4 adalah syarat sebelum adapter dikunci.
- Batas durasi fungsi pada tier hosting gratis dan perilaku cache serverless belum diverifikasi (K-P2.7).
- Parameter numerik (PAR-xx, bobot preset, ambang) adalah asumsi awal yang harus dievaluasi.
- Angka akurasi tidak boleh diklaim sebelum TC-28 dijalankan.