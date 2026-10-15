/**
 * @file algorithms.ts
 * @description Kontrak tipe mesin algoritma mitigasi polusi: estimasi paparan, pembagian segmen, interpolasi IDW, perbandingan Pareto, dan keputusan rekomendasi rute.
 * @author Person 1 (Core Algorithm & System Integration)
 * @module types/algorithms
 * @see CODE_SPEC_AANG.md Bagian 3.5 & 3.8
 */

import type { AqiCategoryCode } from './aqiScale';
import type { LatLngTuple, RouteLabel } from './common';
import type { StationData, FreshnessStatus } from './air-quality';
import type { RouteCandidate } from './routing';

/**
 * Tingkat keyakinan (confidence level) hasil estimasi paparan rute:
 * - `high`: Cakupan stasiun lengkap & data segar (<= 3 jam)
 * - `medium`: Cakupan memadai atau sebagian stasiun berjarak agak jauh
 * - `low`: Jarak stasiun mendekati batas maksimum atau data observasi lama
 * - `unavailable`: Data tidak memadai untuk menghasilkan estimasi ilmiah yang valid
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unavailable';

/**
 * Klasifikasi ketidakpastian jarak segmen terhadap stasiun terdekat:
 * - `near`: Stasiun berada sangat dekat (<= PAR-06, default 3 km)
 * - `medium`: Stasiun berada dalam radius normal (3 km < jarak <= 10 km)
 * - `none`: Tidak ada stasiun dalam radius pencarian
 */
export type UncertaintyClass = 'near' | 'medium' | 'none';

/**
 * Parameter numerik yang mengatur perilaku seluruh algoritma AANG (PAR-01 s/d PAR-14).
 */
export interface AlgorithmParams {
  /** PAR-01: Panjang diskritisasi tiap segmen lintasan dalam meter (default: 500m) */
  segmentLengthMeters: number;
  /** PAR-02: Radius maksimal pencarian stasiun terdekat dalam meter (default: 10.000m / 10km) */
  stationRadiusMeters: number;
  /** PAR-03: Jumlah maksimal stasiun terdekat yang diikutsertakan dalam IDW (default: 3) */
  nearestStationCount: number;
  /** PAR-04: Batas maksimal usia data stasiun dikategorikan 'fresh' dalam menit (default: 180 menit / 3 jam) */
  freshMaxMinutes: number;
  /** PAR-05: Batas usia data stasiun dianggap 'expired' dan diabaikan dalam menit (default: 1440 menit / 24 jam) */
  expiredAfterMinutes: number;
  /** PAR-06: Jarak batas stasiun dianggap dekat untuk keyakinan tinggi dalam meter (default: 3000m / 3km) */
  nearDistanceMeters: number;
  /** PAR-07: Batas persentase perbedaan EI dianggap signifikan dalam persen (default: 5%) */
  significanceThresholdPercent: number;
  /** PAR-08: Rasio cakupan minimum segmen berdata agar estimasi valid (default: 0.20 / 20%) */
  minCoverageRatio: number;
  /** PAR-10: Ambang batas overlap rute untuk mendeteksi rute duplikat (default: 90%) */
  duplicateOverlapPercent: number;
  /** PAR-11: Pangkat pembobotan jarak IDW (default: 2) */
  idwPower: number;
  /** PAR-11: Konstanta epsilon anti-singularitas IDW dalam meter (default: 100m) */
  idwEpsilonMeters: number;
  /** PAR-14: Ambang batas durasi perjalanan panjang untuk pemicu saran istirahat dalam menit (default: 45 menit) */
  longTripMinutes: number;
}

/**
 * Estimasi paparan polusi pada satu potongan segmen diskrit lintasan rute.
 */
export interface SegmentExposure {
  /** Indeks urutan segmen dari awal lintasan (0-based) */
  segmentIndex: number;
  /** Posisi kilometer awal segmen dihitung dari titik keberangkatan */
  startKm: number;
  /** Posisi kilometer akhir segmen dihitung dari titik keberangkatan */
  endKm: number;
  /** Array koordinat geografis pembentuk polyline segmen [lat, lng] untuk visualisasi peta */
  path: LatLngTuple[];
  /** Estimasi durasi melewati segmen ini dalam detik */
  durationSeconds: number;
  /**
   * Estimasi konsentrasi PM2.5 pada segmen dalam µg/m³.
   * Bernilai `null` jika tidak ada stasiun valid dalam radius pencarian.
   */
  pm25: number | null;
  /** Kategori AQI segmen sesuai konsentrasi PM2.5 */
  category: AqiCategoryCode | null;
  /** Kelas ketidakpastian interpolasi segmen */
  uncertaintyClass: UncertaintyClass;
  /** Persentase kontribusi segmen ini terhadap total Exposure Index rute (%) */
  contributionPercent: number | null;
}

/**
 * Informasi stasiun yang berhasil digunakan dalam interpolasi paparan rute.
 */
export interface StationUsed {
  /** ID unik stasiun */
  stationId: string;
  /** Nama stasiun */
  stationName: string;
  /** Jarak terdekat stasiun ke titik/segmen rute dalam satuan meter */
  distanceMeters: number;
  /** Konsentrasi PM2.5 stasiun saat observasi (µg/m³) */
  pm25: number;
  /** Usia data saat analisis dilakukan (menit) */
  ageMinutes: number | null;
  /** Status kesegaran data */
  freshness: FreshnessStatus;
  /** Tipe data stasiun */
  dataType: StationData['dataType'];
}

/**
 * Hasil perhitungan akumulasi paparan polusi untuk satu rute keseluruhan (ALG-01).
 */
export interface RouteExposureEstimate {
  /**
   * Exposure Index (EI) berbasis PM2.5 dalam satuan µg/m³·menit.
   * Rumus: Σ (PM2.5_segmen × durasi_segmen_menit). Bernilai `null` jika data udara tidak tersedia.
   */
  exposureIndexPm25: number | null;
  /** Rata-rata terbobot waktu konsentrasi PM2.5 sepanjang rute (µg/m³) */
  avgPm25: number | null;
  /** Kategori AQI umum rute berdasarkan konsentrasi rata-rata */
  category: AqiCategoryCode | null;
  /** Rasio panjang rute yang berhasil diinterpolasi dengan data stasiun valid (0.0 s/d 1.0) */
  coverageRatio: number;
  /** Tingkat keyakinan hasil estimasi paparan */
  confidenceLevel: ConfidenceLevel;
  /** Usia tertua dari stasiun-stasiun yang digunakan dalam estimasi (menit) */
  maxDataAgeMinutes: number | null;
  /** Menandakan apakah sebagian segmen diisi menggunakan rata-rata segmen berdata (imputasi) */
  isPartiallyImputed: boolean;
  /** Rincian estimasi setiap segmen lintasan */
  segments: SegmentExposure[];
  /** Maksimal 3 segmen dengan kontribusi polusi tertinggi (hotspots) */
  topContributors: SegmentExposure[];
  /** Daftar stasiun unik yang berkontribusi dalam kalkulasi IDW rute */
  stationsUsed: StationUsed[];
}

/**
 * Pesan aksi/rekomendasi proteksi kesehatan berdasarkan aturan PRD (RULE-01 s/d RULE-07).
 */
export interface ActionMessage {
  /** Pengenal aturan PRD */
  ruleId: 'RULE-01' | 'RULE-02' | 'RULE-03' | 'RULE-04' | 'RULE-05' | 'RULE-06' | 'RULE-07';
  /** Tingkat keparahan pesan */
  severity: 'info' | 'attention' | 'warning';
  /** Redaksi teks rekomendasi netral non-klinis */
  message: string;
  /** Dasar rasional/parameter pemicu pesan */
  basis: string;
}

/**
 * Perbandingan komparatif suatu rute alternatif terhadap rute tercepat (baseline).
 */
export interface RouteComparison {
  /** Selisih durasi perjalanan tambahan dalam detik (0 jika ini adalah rute tercepat) */
  extraSeconds: number;
  /** Selisih durasi dalam persen relatif terhadap rute tercepat (contoh: +15.5%) */
  extraPercent: number;
  /**
   * Selisih Exposure Index dalam persen dibanding rute tercepat.
   * Nilai NEGATIF menandakan rute ini LEBIH BERSIH dari rute tercepat (misal: -22.5%).
   * Bernilai `null` jika estimasi polusi salah satu rute tidak tersedia.
   */
  exposureDeltaPercent: number | null;
}

/**
 * Entitas rute lengkap yang menggabungkan geometri, estimasi polusi, metrik komparasi, dan skor kelayakan.
 */
export interface AnalyzedRoute extends RouteCandidate {
  /** Estimasi paparan polusi udara */
  estimate: RouteExposureEstimate;
  /** Metrik komparasi terhadap rute tercepat */
  comparison: RouteComparison;
  /** Menandakan apakah durasi rute masih dalam batas toleransi preferensi `maxExtraTimePercent` */
  withinTimeLimit: boolean;
  /** Menandakan apakah rute terdominasi Pareto (durasi lebih lama DAN polusi lebih buruk) */
  isDominated: boolean;
  /** Skor gabungan optimasi (semakin rendah semakin baik), null jika estimasi tidak tersedia */
  score: number | null;
}

/**
 * Kode alasan penentu keputusan rekomendasi rute:
 * - `BETTER_EXPOSURE`: Rute alternatif memiliki paparan polusi signifikan lebih rendah dan waktu dapat diterima
 * - `FASTEST_IS_BEST`: Rute tercepat juga merupakan rute paling bersih atau perbedaan alternatif tidak menguntungkan
 * - `DIFFERENCE_NOT_SIGNIFICANT`: Perbedaan paparan < PAR-07 (5%), sehingga efisiensi waktu diprioritaskan
 * - `NO_ESTIMATE`: Data kualitas udara tidak tersedia, sistem hanya merekomendasikan berdasarkan kecepatan
 * - `SINGLE_ROUTE`: Hanya satu rute fisik yang ditemukan
 */
export type ExplanationReason =
  | 'BETTER_EXPOSURE'
  | 'FASTEST_IS_BEST'
  | 'DIFFERENCE_NOT_SIGNIFICANT'
  | 'NO_ESTIMATE'
  | 'SINGLE_ROUTE';

/**
 * Informasi penjelas mengapa suatu rute dipilih/direkomendasikan oleh sistem (XAI).
 */
export interface ExplanationInfo {
  /** Kode alasan rekomendasi */
  reasonCode: ExplanationReason;
  /** Kalimat penjelasan yang dirakit dari metrik numerik nyata (TC-32) */
  text: string;
  /** Selisih durasi perjalanan tambahan dalam menit */
  extraMinutes: number | null;
  /** Selisih durasi perjalanan tambahan dalam persen */
  extraPercent: number | null;
  /** Persentase penghematan atau perbedaan paparan polusi */
  exposureDeltaPercent: number | null;
  /** Apakah selisih paparan melampaui batas signifikansi (PAR-07) */
  isSignificant: boolean;
}

/**
 * Hasil agregasi keputusan rekomendasi akhir dari fungsi `decideRoutes`.
 */
export interface DecisionResult {
  /** Daftar seluruh kandidat rute yang telah dianalisis */
  routes: AnalyzedRoute[];
  /** Label rute terpilih ('A', 'B', 'C'), atau null jika seluruh estimasi gagal */
  recommendedRouteLabel: RouteLabel | null;
  /** Penjelasan rasional di balik rekomendasi */
  explanation: ExplanationInfo;
  /** Maksimal 3 pesan rekomendasi/saran mitigasi kesehatan */
  actionMessages: ActionMessage[];
}

/**
 * Hasil pemecahan geometri lintasan rute menjadi segmen diskrit per PAR-01.
 */
export interface PathSegment {
  /** Nomor indeks segmen */
  index: number;
  /** Titik-titik koordinat dalam segmen */
  coordinates: LatLngTuple[];
  /** Panjang fisik segmen dalam meter */
  lengthMeters: number;
  /** Jarak kumulatif dari titik awal ke pangkal segmen (meter) */
  startDistanceMeters: number;
  /** Jarak kumulatif dari titik awal ke ujung segmen (meter) */
  endDistanceMeters: number;
}

/**
 * Hasil perhitungan interpolasi Inverse Distance Weighting pada satu titik.
 */
export interface IdwResult {
  /** Nilai estimasi PM2.5 hasil interpolasi, atau null jika tidak ada stasiun valid */
  pm25: number | null;
  /** Stasiun-stasiun yang digunakan dalam pembobotan */
  stationsUsed: StationUsed[];
  /** Jarak ke stasiun terdekat dalam meter */
  nearestDistanceMeters: number | null;
  /** Kelas ketidakpastian */
  uncertaintyClass: UncertaintyClass;
}

/**
 * Konteks evaluasi aturan pesan rekomendasi kesehatan.
 */
export interface RecommendationContext {
  /** Rute yang saat ini direkomendasikan */
  recommendedRoute: AnalyzedRoute | null;
  /** Rute tercepat sebagai baseline */
  fastestRoute: AnalyzedRoute;
  /** Seluruh alternatif rute */
  allRoutes: AnalyzedRoute[];
  /** Waktu saat ini (ISO string) */
  now: string;
}

// ==========================================
// Tipe Kompatibilitas Mundur (Transisi)
// ==========================================
export type RouteSegmentExposure = SegmentExposure;
export type RecommendationMessage = ActionMessage;
export type RouteAnalysisItem = AnalyzedRoute;
export type { OptimizationPreference } from './preferences';
export type { AnalyzeRoutesResponseData } from './analyze';
