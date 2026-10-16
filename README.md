# AANG — Air-Aware Navigation Guidance

> **"Pilih rute, kenali paparan."**  
> Platform navigasi berbasis web yang membantu masyarakat perkotaan memperkirakan akumulasi paparan polusi udara ($PM_{2.5}$) selama perjalanan dan membandingkan alternatif rute berdasarkan *trade-off* antara waktu tempuh dan estimasi paparan lingkungan.

---

## 🚀 Cara Setup Lingkungan

### 1. Prasyarat Sistem
Pastikan perangkat Anda telah terpasang:
- **Node.js**: Versi `20.x` atau lebih baru (LTS direkomendasikan)
- **npm**: Versi `10.x` atau lebih baru
- **Git**

### 2. Kloning Repositori & Instal Dependensi
```bash
# 1. Clone repositori ke lokal
git clone https://github.com/akbarrmw/air-aware-navigation-guidance.git
cd air-aware-navigation-guidance

# 2. Instal seluruh dependensi proyek
npm install
```

### 3. Konfigurasi Variabel Lingkungan (`.env.local`)
Salin berkas template `.env.example` menjadi `.env.local`:

```bash
# Di Windows PowerShell:
Copy-Item .env.example .env.local

# Di Bash / Linux / macOS:
cp .env.example .env.local
```

Secara default, aplikasi siap dijalankan langsung dengan **mode simulasi** (`DATA_MODE=simulation`) tanpa memerlukan API key eksternal tambahan. Jika ingin menggunakan layanan API live dan Supabase, sesuaikan nilainya di `.env.local`:

```env
# Mode data: 'live' atau 'simulation'
DATA_MODE=simulation

# Layanan Geocoding & Routing
GEOCODER_BASE_URL=https://nominatim.openstreetmap.org
GEOCODER_USER_AGENT=AANG-App/1.0
ROUTING_BASE_URL=https://router.project-osrm.org

# Layanan Kualitas Udara (WAQI)
WAQI_TOKEN=

# Konfigurasi Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 💻 Cara Menjalankan

### 1. Menjalankan Server Pengembangan (Dev Mode)
Jalankan dev server Next.js:
```bash
npm run dev
```
Buka peramban (browser) dan akses: **[http://localhost:3000](http://localhost:3000)**

### 2. Menjalankan Pengujian Otomatis (Testing)
Untuk memastikan seluruh modul algoritma, layanan backend, dan komponen lulus uji:
```bash
npm test
```

### 3. Membangun untuk Produksi (Production Build)
```bash
# Kompilasi build produksi
npm run build

# Menjalankan build produksi
npm run start
```

---

## 🔑 Akun Demo

Untuk keperluan demonstrasi, evaluasi fitur, dan pengujian riwayat perjalanan tanpa perlu mendaftar dari awal, Anda dapat menggunakan akun demo berikut:

| Keterangan | Kredensial |
| :--- | :--- |
| **Email** | `user1@aang.demo` |
| **Kata Sandi** | `user1123` |

### Fitur yang Dapat Diakses dengan Akun Demo:
1. **Penyimpanan Snapshot Rute**: Menyimpan rute pilihan langsung ke database riwayat perjalanan.
2. **Riwayat Perjalanan (`/history`)**: Melihat daftar perjalanan sebelumnya lengkap dengan metrik perbandingan paparan.
3. **Detail Snapshot (`/history/[id]`)**: Memeriksa visualisasi segmen rute, stasiun yang digunakan, dan waktu analisis riwayat lampau.
4. **Pengaturan Preferensi & Privasi (`/settings`)**: Mengatur bobot trade-off paparan vs waktu, batas waktu ekstra, konsensus riwayat, dan manajemen akun.

---

## 🗺️ Navigasi Halaman Utama

- **Beranda (`/`)**: Pengenalan platform, rangkuman kualitas udara kota, dan fitur unggulan.
- **Perencana Rute (`/routes`)**: Input titik keberangkatan dan tujuan, pemilihan moda transportasi, pengaturan preferensi, serta komparasi rute alternatif A/B/C.
- **Peta Kualitas Udara (`/map`)**: Visualisasi interaktif sebaran stasiun pemantau kualitas udara di seluruh Indonesia.
- **Metodologi (`/methodology`)**: Dokumentasi ilmiah transparan mengenai rumus interpolasi IDW, perhitungan *Exposure Index*, dan *Confidence Level*.
- **Autentikasi (`/login`)**: Formulir masuk dan registrasi pengguna baru.

---

## ⚠️ Batasan Klaim & Disclaimer Ilmiah

> Angka akumulasi paparan polusi yang dihasilkan oleh platform AANG adalah **indikator paparan lingkungan berbasis durasi perjalanan ($\mu\text{g}/\text{m}^3 \cdot \text{menit}$)**, bukan dosis inhalasi biologis individual dan bukan diagnosis medis.
