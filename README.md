# AANG — Air-Aware Navigation Guidance

> **"Pilih rute, kenali paparan."**  
> Platform navigasi berbasis web yang membantu masyarakat perkotaan memperkirakan akumulasi paparan polusi udara (PM2.5) selama perjalanan dan membandingkan alternatif rute berdasarkan *trade-off* waktu tempuh vs estimasi paparan lingkungan.

---

## 📚 Dokumen Acuan Utama (Wajib Dibaca Seluruh Tim)

Sebelum mulai menulis kode, setiap anggota tim **wajib membaca 3 dokumen panduan utama** berikut:

1. **[Product Requirements Document (`PRD_AANG_Hackathon.md`)](./PRD_AANG_Hackathon.md)**  
   *Panduan kebutuhan produk, spesifikasi fitur (FR-01 s/d FR-15), algoritma inti (ALG-01 s/d ALG-04), penanganan data tidak tersedia/kedaluwarsa (FR-14), dan batasan klaim (indikator paparan lingkungan, bukan dosis inhalasi klinis).*

2. **[Code Specification (`CODE_SPEC_AANG.md`)](./CODE_SPEC_AANG.md)**  
   *Arsitektur teknis anti-konflik (*Zero Merge Conflict*), kontrak tipe data terpusat (*frozen types*) di `src/types/`, alur pipeline backend, penanganan koordinat OSRM/Leaflet, serta pembagian tugas seimbang untuk 4 orang.*

3. **[Git Workflow & Commit SOP (`SKILL.md`)](./SKILL.md)**  
   *Standar operasional Git bagi seluruh anggota tim dan AI assistant: aturan branch (`feat/*`), Conventional Commits dalam bahasa Inggris, serta batasan izin Git AI (dilarang auto push/pull).*

---

## 🚀 Panduan Setup Lingkungan Pengembangan (Local Setup)

### 1. Prasyarat Sistem
- **Node.js:** Versi 20.x atau lebih baru (Rekomendasi: Node LTS)
- **npm:** Versi 10.x atau lebih baru
- **Git:** Terpasang dan terkonfigurasi dengan akun GitHub masing-masing

### 2. Kloning & Instalasi Dependensi
```bash
# 1. Clone repositori ke komputer lokal Anda
git clone <URL_REPOSITORI_GITHUB>
cd air-aware-navigation-guidance

# 2. Instal seluruh paket dependensi yang telah disiapkan
npm install
```

### 3. Konfigurasi Variabel Lingkungan (`.env.local`)
Salin file template `.env.example` menjadi `.env.local`:
```bash
# Di Windows PowerShell:
Copy-Item .env.example .env.local

# Di Bash / Linux / macOS:
cp .env.example .env.local
```

File `.env.local` secara default sudah tersetel ke **mode simulasi**:
```env
DATA_MODE=simulation
GEOCODER_BASE_URL=https://nominatim.openstreetmap.org
GEOCODER_USER_AGENT=AANG-Hackathon-App/1.0 (contact@aang.local)
ROUTING_BASE_URL=https://router.project-osrm.org
PILOT_CITY_BBOX=[-7.08, 110.32, -6.93, 110.50]
```
> 💡 **Catatan Mode Simulasi (`DATA_MODE=simulation`):**  
> Aplikasi dapat dijalankan dan diuji langsung secara offline atau tanpa API key. Seluruh data stasiun dan alternatif rute diambil otomatis dari fixture `src/fixtures/`. Mode ini menjaga demo tetap stabil jika layanan eksternal mengalami gangguan kuota/jaringan.

### 4. Menjalankan Aplikasi & Pengujian
```bash
# Menjalankan development server (Next.js App Router)
npm run dev
# Buka peramban di http://localhost:3000

# Menjalankan pengujian otomatis (Vitest)
npm test

# Memvalidasi kelayakan kompilasi produksi
npm run build
```

---

## 👥 Pembagian Tugas Tim (4 Orang) & Matriks Kepemilikan File

Mengacu pada arsitektur seimbang di **`CODE_SPEC_AANG.md`**, setiap anggota memiliki ruang kerja (*domain*) terisolasi untuk mencegah *merge conflict*. **Dilarang menyunting file di luar folder hak milik Anda.**

| Peran | Penanggung Jawab | Fokus & Tanggung Jawab Utama | Folder & File Hak Milik |
|:---|:---|:---|:---|
| **Person 1** | *Integrator, Kontrak & Algoritma* | Konversi AQI, interpolasi IDW (ALG-02), estimasi paparan (ALG-01), scoring multi-kriteria (ALG-03), rule anjuran (ALG-04), serta halaman Beranda & Metodologi. | `src/config/parameters.ts`<br>`src/lib/algorithms/*`<br>`tests/algorithms/*`<br>`src/app/page.tsx`<br>`src/app/methodology/*` |
| **Person 2** | *Backend Services & API Pipeline* | Adapter eksternal (Nominatim, WAQI, OSRM/ORS, Open-Meteo), cache TTL memori, normalisasi koordinat `[lng,lat]` → `[lat,lng]`, simulation fallback, dan route handler Next.js. | `src/config/constants.ts`<br>`src/fixtures/*`<br>`src/lib/services/*`<br>`src/lib/utils/*`<br>`src/app/api/{geocode,air-quality,routes}/*`<br>`tests/services/*` |
| **Person 3** | *Database, Auth & Peta Udara* | Skema DDL PostgreSQL & RLS Supabase, Auth helper, API riwayat perjalanan/consent, halaman Login, Riwayat, Pengaturan, serta **Halaman Peta Kualitas Udara (`/map`)**. | `supabase/migrations/*`<br>`src/lib/supabase/*`<br>`src/app/{login,history,settings,map}/*`<br>`src/components/{history,air-map}/*`<br>`tests/database/*` |
| **Person 4** | *Frontend UI/UX & Core Route Planner* | Desain sistem visual (`globals.css`), pembungkus Leaflet map container (SSR-safe), marker polusi, polyline rute A/B/C, slider preferensi, dan **Perencana Rute Utama (`/routes`)**. | `src/app/globals.css`<br>`src/app/layout.tsx`<br>`src/app/routes/*`<br>`src/components/{map,route-planner,common}/*`<br>`tests/ui/*` |

---

## 🛡️ Aturan Kerja Git & SOP Kolaborasi (Mengacu pada SKILL.md)

### 1. Konvensi Penamaan Branch
Setiap pekerjaan fitur baru **wajib** dibuat di branch terpisah dengan format:
`feat/<feature-name>`

Contoh:
- `feat/air-quality-map` (Pekerjaan peta udara)
- `feat/personal-exposure-estimation` (Pekerjaan algoritma paparan)
- `feat/route-optimization` (Pekerjaan trade-off rute)
- `feat/exposure-history` (Pekerjaan riwayat Supabase)
- `fix/<issue-name>` (Untuk perbaikan bug)
- `docs/<topic-name>` (Untuk perubahan dokumentasi)

### 2. Konvensi Commit Message
Gunakan standar **Conventional Commits** dalam **bahasa Inggris** dengan kalimat imperatif:
`<type>(<scope>): <imperative description>`

Contoh:
- `feat(exposure): calculate personal pollution exposure`
- `feat(routing): compare alternative travel routes`
- `feat(map): display air quality markers`
- `fix(exposure): handle missing pollution readings`
- `test(exposure): cover exposure calculation edge cases`

### 3. Batasan Izin AI Coding Assistant (Strict SOP)
Jika Anda menggunakan AI coding assistant (Antigravity, Cursor, Copilot, dll.):
- ✅ **AI diperbolehkan:** Menginspeksi status git, membuat branch lokal, mengedit kode sesuai scope, menjalankan tes, dan melakukan `git add` serta `git commit` lokal jika diminta.
- ❌ **AI DILARANG KERAS melakukan `git push` dan `git pull`.**
- 👤 **Push ke GitHub wajib dilakukan manual oleh anggota tim** menggunakan akun GitHub dan kredensial masing-masing setelah meninjau perubahan kode.

---

## 🚦 Alur Integrasi Harian (Gate Dependensi G0 — G5)

```
Gate G0 (Scaffold & Kontrak Beku):
├── Kunci kontrak di src/types/ (FROZEN CONTRACT)
└── Siapkan mockAnalysis dan seluruh stub function agar tidak ada yang saling menunggu

Gate G1 - G2 (Backend & Pipeline Aktif):
├── P1 menyelesaikan logika murni kalkulasi (ALG-01..04)
├── P2 menyelesaikan adapter OSRM, WAQI, Nominatim & pipelineService
└── Endpoint POST /api/routes/analyze aktif

Gate G3 - G4 (UI Rute & Riwayat Tersambung):
├── P4 menghubungkan form /routes dan kalkulasi klien decideRoutes ke endpoint P2
└── P3 menghubungkan fitur simpan trip, login auth, dan riwayat perjalanan

Gate G5 (Pengerasan & Finalisasi):
├── Uji skenario data hilang (FR-14), verifikasi TC-01..TC-35
└── Deploy Vercel, rekam video demo 2-3 menit, dan kumpulkan.
```

---

## ⚠️ Batasan Klaim & Disclaimer Ilmiah

> **PENTING UNTUK PRESENTASI & DEMO:**  
> Angka akumulasi paparan yang dihasilkan AANG adalah **indikator paparan berbasis lingkungan dan durasi perjalanan ($\mu g/m^3 \cdot \text{menit}$)**, bukan dosis inhalasi individu dan bukan indikator risiko klinis medis. Aplikasi ini tidak mendiagnosis penyakit. Narasi produk berfokus pada **transparansi ketidakpastian dan penjelasan trade-off waktu vs polusi**.
