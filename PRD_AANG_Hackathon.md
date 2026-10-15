# Product Requirements Document — AANG (Air-Aware Navigation Guidance — Versi Hackathon)

| Atribut | Nilai |
|---|---|
| **Nama produk** | AANG (Air-Aware Navigation Guidance) |
| **Versi dokumen** | 0.2 (adaptasi hackathon dari v0.1) |
| **Tanggal** | 13 Oktober 2026 |
| **Tenggat pengumpulan** | 16 Oktober 2026 (jam pasti: TBD, OQ-01) |
| **Status** | Draft siap dieksekusi; keputusan terbuka ada di Lampiran A |

---

## 0. Pendahuluan Dokumen

### 0.1 Tujuan
Mendefinisikan kebutuhan produk dan sistem EcoPulse yang dapat diselesaikan dan didemonstrasikan dalam waktu sekitar tiga hari, memakai layanan gratis, serta tetap dapat ditelusuri (FR → US → AC → TC). Dokumen ini bukan dokumen implementasi dan tidak memuat kode.

### 0.2 Ruang Lingkup
EcoPulse adalah aplikasi web yang membantu masyarakat perkotaan (1) memahami **estimasi paparan polusi udara** selama perjalanan dan (2) **memilih rute** dengan mempertimbangkan waktu tempuh dan estimasi paparan. Hasil analisis dapat disimpan sebagai riwayat oleh pengguna terdaftar. Batas In/Out of Scope mengikuti Bagian 1.7.

### 0.3 Perubahan dari v0.1

| Aspek | v0.1 (proyek kuliah) | v0.2 (hackathon) |
|---|---|---|
| Stack | Express + MySQL + HTML/CSS murni | Next.js + Supabase + Vercel (semua tier gratis) |
| Autentikasi | Session cookie buatan sendiri | Supabase Auth; isolasi data via Row Level Security |
| Prioritas auth dan riwayat | Must | **Should**: alur inti (analisis rute) tidak memerlukan login |
| Ketentuan khusus kuliah (struktur folder wajib, dokumen pengumpulan, presentasi) | Ada | **Dihapus** |
| Pembagian tugas tim, kapasitas tim | Disebut | **Dihapus**; roadmap berbasis dependensi dan hari, tanpa pemilik tugas |
| Fitur dipangkas | — | Rate limit kustom, retensi otomatis, ringkasan pola 7/30 hari (Could), ekspor data |
| Fallback data udara | Future | **Should**: Open-Meteo Air Quality (data model) bila stasiun tidak memadai |

### 0.4 Referensi
| ID | Referensi |
|---|---|
| REF-01 | Prompt penyusunan PRD EcoPulse (sumber kebutuhan, struktur, dan batasan lingkup) |
| REF-02 | PRD EcoPulse v0.1 (sumber ID FR/US/TC/ALG yang dipertahankan) |
| REF-03 | Aturan hackathon: **belum dilampirkan** (OQ-01) |

Catatan: PRD ini tidak lagi memakai ketentuan "Project PPK 2026". Jika aturan hackathon membatasi teknologi, penilaian, atau format pengumpulan, bagian terkait harus disesuaikan (OQ-01).

### 0.5 Asumsi Penting
| ID | Asumsi | Dampak jika salah |
|---|---|---|
| ASM-01 | Hackathon tidak membatasi framework atau layanan; stack bebas | Stack dan DEC-01 disesuaikan |
| ASM-02 | Tier gratis Vercel, Supabase, WAQI, Open-Meteo, OSRM demo/ORS, Nominatim cukup untuk demo. **Belum diverifikasi** | Layanan diganti atau data fixture dipakai |
| ASM-03 | Satu kota pilot dengan stasiun udara memadai | Estimasi tidak tersedia di luar kota pilot |
| ASM-04 | Moda perjalanan: kendaraan bermotor di jalan (profil mobil) | Moda lain = Future |
| ASM-05 | Keberangkatan = saat analisis; tidak ada forecast | — |
| ASM-06 | Tidak ada data kemacetan real-time; waktu tempuh bebas hambatan | Waktu cenderung optimis pada jam sibuk |
| ASM-07 | Nilai dari WAQI berupa indeks AQI per polutan, dikonversi ke µg/m³ dengan tabel breakpoint yang versinya dipilih tim | Metrik beralih ke indeks paparan berbasis AQI |
| ASM-08 | Semua parameter numerik (PAR-xx) dan target (M-xx) adalah asumsi awal yang boleh disesuaikan | — |
| ASM-09 | Tidak ada verifikasi email pada MVP | Akun palsu mudah dibuat |
| ASM-10 | Juri menilai demo langsung/video dan repositori; deploy publik tersedia | Format pengumpulan disesuaikan |

### 0.6 Konvensi ID
PR masalah, G tujuan, M metrik, A aktor, UJ user journey, FR functional requirement, US user story, AC acceptance criteria (`AC-<FR>.<urut>`), NFR non-functional, D data, ALG algoritma, BR business rule, PAR parameter, RULE aturan rekomendasi, P halaman, E entitas, API endpoint, TC test case, SEC keamanan, RISK risiko, DEC keputusan, OQ pertanyaan terbuka.

---

## Bagian 1 — Product Overview

### 1.1 Identitas
Nama: **EcoPulse**. Tagline: *Pilih rute, kenali paparan.* Jenis: aplikasi web.

### 1.2 Ringkasan
EcoPulse menampilkan peta stasiun kualitas udara, menerima titik asal dan tujuan, menghasilkan hingga tiga alternatif rute, menghitung **indeks paparan PM2.5 berbasis konsentrasi dan durasi** untuk tiap rute, lalu membandingkan rute menurut preferensi waktu vs paparan. Sistem menjelaskan alasan rekomendasi, menyatakan tingkat keyakinan dan sumber data, dan (untuk pengguna terdaftar) menyimpan riwayat.

### 1.3 Latar Belakang dan Problem Statement
Kota menghadapi polusi udara dan kemacetan, sementara ruang hijau terbatas. Informasi kualitas udara umumnya hanya berupa angka atau peta per stasiun dan tidak diterjemahkan menjadi keputusan perjalanan individu.

**Problem statement:** Masyarakat perkotaan tidak memiliki cara mudah dan transparan untuk memperkirakan paparan polusi selama perjalanan dan membandingkan alternatif berdasarkan trade-off waktu dan estimasi paparan.

### 1.4 Tujuan Produk
| ID | Tujuan | Masalah |
|---|---|---|
| G-01 | Informasi kualitas udara yang transparan (sumber, waktu observasi, kesegaran) | PR-01, PR-05 |
| G-02 | Estimasi paparan perjalanan yang dapat dijelaskan dan jujur terhadap batasannya | PR-02, PR-05 |
| G-03 | Perbandingan dan pemilihan rute berdasarkan waktu dan estimasi paparan | PR-03 |
| G-04 | Rekomendasi tindakan yang aman, non-klinis, berbasis aturan | PR-04 |
| G-05 | Riwayat paparan personal dengan privasi terjaga | PR-06 |

### 1.5 Nilai Utama dan UVP (hipotesis)
Pengguna melihat harga (waktu tambahan) dan manfaat (penurunan estimasi paparan) tiap alternatif dalam satu tampilan, disertai alasan dan tingkat keyakinan.

| ID | Hipotesis (belum tervalidasi) | Cara validasi |
|---|---|---|
| H-01 | Menggabungkan estimasi paparan dan perbandingan rute memberi informasi baru dibanding aplikasi navigasi (waktu/jarak) atau peta udara (per titik) | Uji cepat 3–5 orang (TC-27) |
| H-02 | Penjelasan trade-off eksplisit ("+3 menit, estimasi paparan −16%") lebih mudah dipahami daripada skor tunggal | Pertanyaan pemahaman |
| H-03 | Transparansi atas keterbatasan data meningkatkan kepercayaan | Pertanyaan kepercayaan |

EcoPulse tidak diklaim sebagai produk pertama atau satu-satunya.

### 1.6 Pembeda yang Realistis
Pembeda utama adalah **pelabelan ketidakpastian yang tegas** dan **penjelasan trade-off**, bukan akurasi lebih tinggi dari aplikasi lain.

### 1.7 Batasan Produk
**In Scope:** peta kualitas udara; pencarian lokasi; alternatif rute; estimasi paparan (konsentrasi × durasi); rekomendasi tindakan; preferensi optimasi; penjelasan rekomendasi; integrasi API eksternal; riwayat perjalanan dengan persetujuan; penanganan data tidak tersedia/kedaluwarsa/cakupan terbatas; pengujian estimasi.

**Out of Scope:** diagnosis atau prediksi penyakit; klaim dosis terhirup; wearable/IoT; marketplace, sosial, gamifikasi; rekomendasi ruang hijau; analisis tata kota; ML kompleks tanpa data latih.

**Batas klaim:** angka adalah *indikator paparan berbasis data lingkungan dan durasi*, bukan dosis inhalasi dan bukan risiko klinis.

---

## Bagian 2 — Problem Analysis

| ID | Masalah | Penyebab | Dampak | Fitur penangan |
|---|---|---|---|---|
| PR-01 | Sulit mengetahui kualitas udara di lokasi/waktu tertentu | Data tersebar dan hanya titik stasiun | Keputusan tanpa informasi | FR-01, FR-04 |
| PR-02 | Sulit memperkirakan paparan selama perjalanan | Paparan bergantung pada konsentrasi sepanjang rute dan lama berada di sana; informasi publik hanya nilai sesaat | Paparan dinilai dari satu angka AQI | FR-05, FR-09 |
| PR-03 | Sulit membandingkan perjalanan berdasar waktu dan polusi | Aplikasi navigasi tidak menampilkan polusi; peta udara tidak menampilkan rute | Pilihan rute hanya berdasar waktu | FR-02, FR-03, FR-06, FR-07 |
| PR-04 | Tidak tahu tindakan wajar untuk mengurangi paparan | Kategori udara tidak dikaitkan dengan durasi dan pilihan rute | Tindakan tidak terarah | FR-08 |
| PR-05 | Tidak tahu seberapa andal informasi | Sumber, waktu observasi, cakupan stasiun tidak dikomunikasikan | Kepercayaan salah | FR-04, FR-09, FR-14, FR-15 |
| PR-06 | Kekhawatiran privasi lokasi dan sulit melihat pola personal | Asal-tujuan sensitif; tidak ada pencatatan estimasi | Enggan memakai; tidak ada pola | FR-10, FR-11, FR-13 |

**Keterbatasan sumber:** stasiun jarang dan tidak merata; sumber dapat memberi indeks AQI, bukan konsentrasi mentah; pembaruan berbeda per stasiun; API routing gratis tidak menyediakan kemacetan real-time; kuota API gratis terbatas.

**Mengapa peta saja belum cukup:** peta menjawab "bagaimana kondisi di titik X?", bukan "bagaimana dampak pilihan perjalanan saya?". Peta tidak mengintegrasikan durasi, rute alternatif, riwayat, atau penjelasan trade-off.

---

## Bagian 3 — Target User dan User Journey

Tidak ada aktor admin karena tidak ada kebutuhan operasional atau moderasi.

| Atribut | A-01 Pengunjung | A-02 Pengguna Terdaftar |
|---|---|---|
| Tujuan | Melihat kualitas udara dan mencoba analisis rute tanpa daftar | Menyimpan preferensi dan riwayat |
| Kebutuhan | Akses cepat; hasil mudah dibaca | Riwayat privat; kontrol data |
| Hambatan | Tidak percaya data; enggan berbagi lokasi | Kekhawatiran privasi |
| Hak akses | Peta, pencarian, analisis rute, preferensi sementara (di browser), metodologi. Tidak ada penyimpanan di server | Hak A-01 + simpan/lihat/hapus riwayat sendiri, preferensi tersimpan, hapus akun |
| Alur | Landing → peta/rute → hasil → (ajakan daftar untuk menyimpan) | Daftar → login → analisis → simpan → riwayat → pengaturan/hapus data |

**UJ-01 Memeriksa kualitas udara:** buka peta (P-02) → marker stasiun berwarna kategori → klik marker → detail polutan, waktu observasi, sumber, kesegaran → bila data kedaluwarsa/tidak ada, pesan jelas.

**UJ-02 Merencanakan perjalanan:** buka P-03 → isi asal dan tujuan (cari teks atau klik peta) → (opsional) atur preferensi → "Analisis Rute" → loading → hasil atau pesan keterbatasan.

**UJ-03 Membandingkan rute:** lihat tabel A/B/C (waktu, jarak, indeks paparan, selisih vs tercepat, keyakinan) → lihat garis rute di peta dengan label sama → baca rute rekomendasi dan alasan → ubah preferensi untuk hitung ulang.

**UJ-04 Melihat estimasi paparan:** pilih rute → panel detail: rata-rata PM2.5 terbobot waktu, indeks paparan, kategori, 3 segmen kontributor terbesar, stasiun yang dipakai, usia data, keyakinan, label "estimasi — bukan dosis".

**UJ-05 Membaca rekomendasi:** panel menampilkan maksimal 3 pesan berdasar aturan, tiap pesan memuat dasarnya; bila data tidak tersedia, hanya pesan ketidaktersediaan.

**UJ-06 Melihat riwayat:** login → "Simpan perjalanan" (persetujuan diminta bila belum ada) → Riwayat (P-06) → detail (P-07) → hapus perjalanan atau tarik persetujuan di Pengaturan (P-08).

---

## Bagian 4 — Success Metrics

**Indikator keberhasilan MVP:** alur end-to-end (cari asal-tujuan → rute alternatif → data udara → estimasi → perbandingan → rekomendasi beralasan) dapat didemonstrasikan pada kota pilot dengan data nyata, dan perilaku data tidak tersedia/kedaluwarsa bekerja sesuai spesifikasi. Tidak ada metrik berupa penyakit yang dicegah.

| ID | Kategori | Metrik | Cara ukur | Target (asumsi) |
|---|---|---|---|---|
| M-01 | Fungsional | Alur end-to-end berhasil (hasil atau pesan ketidaktersediaan sesuai spesifikasi) | Skrip uji 10 pasangan asal-tujuan kota pilot | ≥ 90% |
| M-02 | Fungsional | AC prioritas Must yang lulus | Checklist | 100% |
| M-03 | Kualitas estimasi | Rute uji dengan keyakinan ≥ Medium | Skrip M-01 | ≥ 70% (bergantung kepadatan stasiun) |
| M-04 | Kualitas estimasi | Ketepatan hitungan terhadap fixture manual | Unit test ALG-01 | Selisih ≤ 0,01 |
| M-05 | Kualitas estimasi | Galat interpolasi (MAE, RMSE) leave-one-station-out | TC-28 | **Dilaporkan**, tanpa klaim akurasi sebelum diuji |
| M-06 | Kualitas optimasi | Rekomendasi tidak melanggar batas waktu tambahan | Unit test ALG-03 | 100% |
| M-07 | Kualitas optimasi | Pada preset "Udara Bersih", EI rute rekomendasi ≤ rute tercepat | Unit test | 100% |
| M-08 | Kualitas optimasi | Angka di teks alasan identik dengan tabel | TC-32 | 100% |
| M-09 | Performa | p95 `POST /api/routes/analyze` | TC-29 | ≤ 8 dtk dingin, ≤ 3 dtk hangat |
| M-10 | Performa | Peta dan marker pertama tampil | Pengukuran browser | ≤ 4 dtk |
| M-11 | Usability | 3 tugas (lihat udara, analisis rute, baca rekomendasi) selesai tanpa bantuan | Uji 3–5 orang | ≥ 80% |
| M-12 | Usability | Responden memahami bahwa angka adalah estimasi, bukan dosis | Pertanyaan singkat | ≥ 70% |
| M-13 | Privasi | Temuan akses data lintas pengguna | TC-22 | 0 |

---

## Bagian 5 — Functional Requirements

Prioritas: **Must**, **Should**, **Could**, **Future**. ID FR sama dengan v0.1.

### FR-01 — Peta kualitas udara (Must)
- **Aktor:** A-01, A-02. **Masalah:** PR-01, PR-05.
- **Input:** bounding box viewport.
- **Proses:** klien kirim bbox → backend ambil stasiun (cache TTL 10 menit) → normalisasi (FR-04) → klien tampilkan marker; klik membuka detail.
- **Output:** marker berwarna kategori; detail: nama, koordinat, AQI, polutan dominan, nilai polutan tersedia, `observedAt`, usia data, kesegaran, sumber, tipe data.
- **Berhasil:** semua stasiun dalam bbox tampil; detail memuat waktu observasi dan sumber. **Gagal:** sumber tidak tersedia → cache berlabel usia, atau pesan error; tanpa stasiun → "tidak ada stasiun di area ini".
- **Dependensi:** FR-04.
- **AC:** **AC-01.1** marker semua stasiun bbox tampil dengan warna sesuai kategori. **AC-01.2** detail selalu memuat `observedAt`, usia, sumber. **AC-01.3** stasiun > 24 jam ditandai "kedaluwarsa" dan tidak dipakai di FR-05. **AC-01.4** sumber gagal + cache ada → data cache berlabel usia; tanpa cache → pesan error.

### FR-02 — Pencarian lokasi asal dan tujuan (Must)
- **Aktor:** A-01, A-02. **Masalah:** PR-03.
- **Input:** teks 3–100 karakter **atau** titik di peta.
- **Proses:** pencarian dikirim saat tombol/Enter (bukan autocomplete, menghormati batas geocoder) → backend panggil geocoder, maksimal 5 kandidat → klik peta menghasilkan titik berlabel koordinat → validasi koordinat dalam area kota pilot.
- **Output:** kandidat `{label, lat, lng}`; titik terpilih di peta.
- **Berhasil:** asal dan tujuan valid. **Gagal:** hasil kosong → pesan; di luar cakupan → peringatan; geocoder gagal → opsi klik peta.
- **Dependensi:** geocoder, FR-14.
- **AC:** **AC-02.1** query < 3 karakter ditolak (client dan server). **AC-02.2** ≤ 5 kandidat berlabel dan berkoordinat. **AC-02.3** titik di luar area kota pilot memunculkan peringatan sebelum analisis. **AC-02.4** kegagalan geocoder tetap memungkinkan pemilihan lewat peta.

### FR-03 — Alternatif rute (Must)
- **Aktor:** A-01, A-02. **Masalah:** PR-03.
- **Input:** koordinat asal dan tujuan; moda kendaraan.
- **Proses:** minta rute + alternatif dari mesin routing → buang duplikat (tumpang tindih > PAR-10) → urutkan menurut waktu → maksimal 3 → label A/B/C (A tercepat).
- **Output:** per rute: label, jarak, durasi, geometri, `isFastest`.
- **Berhasil:** ≥ 1 rute; bila hanya satu, pengguna diberi tahu bahwa alternatif tidak tersedia. **Gagal:** rute tidak ditemukan; asal ≈ tujuan (< 100 m); timeout → pesan jelas.
- **Dependensi:** routing, FR-02, FR-14.
- **AC:** **AC-03.1** rute A durasi terpendek. **AC-03.2** tidak ada dua rute dengan tumpang tindih > PAR-10. **AC-03.3** ≤ 3 kandidat. **AC-03.4** jarak < 100 m ditolak. **AC-03.5** satu rute → pesan "tidak ada alternatif" dan estimasi tetap berjalan.

### FR-04 — Pengambilan dan normalisasi data udara (Must)
- **Aktor:** sistem. **Masalah:** PR-01, PR-05.
- **Input:** bbox atau titik + radius.
- **Proses:** panggil adapter → petakan field → konversi AQI per polutan ke estimasi konsentrasi (ASM-07) → hitung `ageMinutes` dan `freshness` → cache.
- **Output:** `stationId, stationName, lat, lng, aqi, dominantPollutant, pm25Concentration (nullable), pm10Concentration (nullable), observedAt, ageMinutes, freshness, dataType, sourceName`.
- **Berhasil:** skema konsisten tanpa memandang sumber. **Gagal:** timeout/error → 1× retry → cache → "tidak tersedia"; field hilang → `null`, bukan 0.
- **Dependensi:** token WAQI; (Should) Open-Meteo.
- **AC:** **AC-04.1** polutan tidak tersedia = `null`. **AC-04.2** fresh ≤ 3 jam; stale > 3–24 jam; expired > 24 jam. **AC-04.3** token API tidak pernah muncul di respons atau bundel frontend. **AC-04.4** konversi AQI→konsentrasi lolos uji nilai batas tabel breakpoint. **AC-04.5** data dari fallback model berlabel "Data model", bukan "Observasi stasiun".

### FR-05 — Estimasi paparan perjalanan (Must)
- **Aktor:** A-01, A-02. **Masalah:** PR-02.
- **Input:** geometri dan durasi tiap rute; stasiun valid.
- **Proses:** ALG-01 dan ALG-02.
- **Output:** per rute: `exposureIndexPm25` (µg/m³·menit), `avgPm25`, `aqiCategory`, `coverageRatio`, `confidenceLevel`, `maxDataAgeMinutes`, `isPartiallyImputed`, segmen.
- **Berhasil:** nilai dihitung dengan keyakinan ≥ Low dan tidak disebut dosis. **Gagal:** `coverageRatio` < PAR-08 → EI `null`, "tidak tersedia", rute tetap tampil berdasar waktu.
- **Dependensi:** FR-03, FR-04.
- **AC:** **AC-05.1** konsentrasi konstan 20 µg/m³ selama 10 menit → 200 µg/m³·menit, rata-rata 20. **AC-05.2** rute 1,2 km → segmen 500, 500, 200 m dengan waktu proporsional jarak. **AC-05.3** data tidak tersedia tidak pernah dihitung 0. **AC-05.4** stasiun expired tidak dihitung; stale dihitung dan menurunkan keyakinan. **AC-05.5** hasil berlabel "estimasi sistem (interpolasi)" dengan tautan metodologi.

### FR-06 — Perbandingan dan rekomendasi rute (Must)
- **Aktor:** A-01, A-02. **Masalah:** PR-03.
- **Input:** rute + estimasi, preferensi (FR-07).
- **Proses:** ALG-03.
- **Output:** tabel (waktu, jarak, EI, selisih vs tercepat dalam menit/% dan %, keyakinan); `recommendedRouteLabel`; teks alasan; penanda "terdominasi".
- **Berhasil:** satu rute direkomendasikan atau ada pesan mengapa tidak ada rekomendasi berbasis polusi. **Gagal:** semua estimasi tidak tersedia → urutan waktu saja, tanpa klaim "rendah polusi".
- **Dependensi:** FR-03, FR-05, FR-07.
- **AC:** **AC-06.1** rekomendasi tidak melanggar `maxExtraTimePercent`. **AC-06.2** selisih EI < PAR-07 → tercepat direkomendasikan, pesan "tidak signifikan". **AC-06.3** angka di teks alasan identik dengan tabel. **AC-06.4** rute terdominasi (lebih lama dan paparan ≥) diberi tanda. **AC-06.5** tercepat sekaligus terendah → "tidak ada alternatif yang lebih baik".

### FR-07 — Preferensi optimasi (Must)
- **Aktor:** A-01 (sementara di browser), A-02 (tersimpan).
- **Input:** `exposureWeight` ∈ [0,1] melalui preset (Tercepat 0, Seimbang 0,5, Udara Bersih 0,8) atau slider; `maxExtraTimePercent` ∈ [0,100] atau tidak dibatasi.
- **Proses:** validasi client dan server; A-02 simpan ke profil; A-01 simpan di sessionStorage dan kirim bersama analisis.
- **Berhasil:** preferensi memengaruhi ALG-03. **Gagal:** di luar rentang → 400.
- **AC:** **AC-07.1** `exposureWeight` di luar 0–1 ditolak server. **AC-07.2** preferensi tersimpan dimuat saat login. **AC-07.3** mengubah preferensi tidak memanggil ulang routing selama hasil rute masih ada di state klien. **AC-07.4** default: Seimbang, +30%.

### FR-08 — Rekomendasi tindakan (Must)
- **Aktor:** A-01, A-02. **Masalah:** PR-04.
- **Input:** kategori rata-rata rute, durasi, keyakinan, kesegaran, selisih rute rekomendasi vs tercepat.
- **Proses:** ALG-04, ambil maksimal 3 pesan berprioritas.
- **Output:** daftar `{ruleId, severity, message, basis}` + tautan metodologi.
- **Gagal:** estimasi tidak tersedia → hanya pesan ketidaktersediaan (RULE-08).
- **AC:** **AC-08.1** ≤ 3 pesan. **AC-08.2** tidak ada diagnosis, penyakit, atau dosis. **AC-08.3** keyakinan Low atau data stale menambah pesan RULE-06. **AC-08.4** uji berbasis tabel untuk tiap RULE.

### FR-09 — Detail estimasi paparan (Must)
- **Aktor:** A-01, A-02. **Masalah:** PR-02, PR-05.
- **Proses:** kontribusi segmen = `C_i·Δt_i / EI`; urutkan 3 teratas.
- **Output:** garis rute berwarna per kategori; 3 kontributor teratas (rentang km, konsentrasi, % kontribusi); stasiun yang dipakai (jarak, nilai, usia); keyakinan + alasan; teks batasan.
- **AC:** **AC-09.1** total kontribusi = 100 ± 0,5%. **AC-09.2** setiap stasiun tampil dengan jarak dan usia. **AC-09.3** selalu memuat "estimasi indikator paparan, bukan dosis terhirup".

### FR-10 — Akun dan autentikasi (Should)
- **Aktor:** A-01 (calon), A-02.
- **Input:** email valid, kata sandi ≥ 8 (huruf dan angka); login: email, kata sandi.
- **Proses:** Supabase Auth (registrasi, login, logout); validasi client dan server; endpoint privat memeriksa sesi.
- **Gagal:** email terdaftar; kata sandi lemah; kredensial salah (pesan generik).
- **AC:** **AC-10.1** kata sandi tidak pernah disimpan atau di-log oleh aplikasi (dikelola penyedia auth). **AC-10.2** pesan gagal login tidak membedakan email tidak ada vs sandi salah. **AC-10.3** setelah logout, akses fitur privat ditolak. **AC-10.4** validasi client dan server konsisten.

### FR-11 — Simpan perjalanan dan riwayat (Should)
- **Aktor:** A-02. **Masalah:** PR-06.
- **Proses:** "Simpan perjalanan" → bila belum ada persetujuan, tampil dialog persetujuan → simpan snapshot estimasi rute terpilih dan baseline rute tercepat → riwayat terpaginasi.
- **Gagal:** tanpa persetujuan ditolak; tanpa login ditolak; gagal simpan → tidak ada data parsial.
- **AC:** **AC-11.1** simpan tanpa persetujuan ditolak. **AC-11.2** riwayat hanya milik pengguna sesi (RLS). **AC-11.3** nilai riwayat tidak berubah saat data lingkungan berubah (snapshot). **AC-11.4** perjalanan "tanpa estimasi" boleh disimpan dan ditandai.

### FR-12 — Ringkasan pola paparan 7/30 hari (Could)
Agregasi jumlah perjalanan, total dan rata-rata EI, deret harian (grafik batang), 3 perjalanan tertinggi, dan selisih kumulatif terhadap "selalu rute tercepat". **AC-12.1** total = jumlah EI perjalanan berestimasi dalam rentang. **AC-12.2** perjalanan tanpa estimasi dikecualikan.

### FR-13 — Data pribadi dan persetujuan (Should)
Hapus satu/semua perjalanan, tarik persetujuan, hapus akun (konfirmasi). **AC-13.1** setelah hapus akun tidak ada baris milik pengguna. **AC-13.2** hapus semua hanya menghapus milik pengguna tersebut. **AC-13.3** tarik persetujuan membuat simpan baru ditolak.

### FR-14 — Kegagalan dan keterbatasan data eksternal (Must)
Perilaku seragam: timeout → 1× retry → cache → pesan; label tipe data dan usia. **AC-14.1** tiap baris matriks di bawah teruji. **AC-14.2** respons error tanpa stack trace atau token. **AC-14.3** data fixture selalu berbanner "DATA SIMULASI".

| Kondisi | Perilaku |
|---|---|
| Geocoder gagal | Pesan + opsi klik peta |
| Routing gagal/timeout | Pesan; tanpa estimasi; coba lagi |
| Hanya satu rute | Tampilkan satu rute + "tidak ada alternatif" |
| Sumber udara gagal, cache ada | Pakai cache berlabel usia; keyakinan turun |
| Sumber udara gagal, tanpa cache | Rute berdasar waktu; estimasi "tidak tersedia" |
| Tidak ada stasiun dalam radius | Segmen "tanpa data", bukan 0; coverage turun |
| Semua stasiun kedaluwarsa | Estimasi tidak tersedia |
| PM2.5 tidak ada pada stasiun | Stasiun dikeluarkan dari estimasi PM2.5 |
| Titik di luar cakupan | Peringatan; estimasi tidak tersedia |

### FR-15 — Halaman metodologi dan disclaimer (Must)
Halaman statis: definisi (konsentrasi, indikator paparan, dosis, risiko), sumber data, rumus ringkas, batasan, atribusi sumber. **AC-15.1** memuat definisi empat konsep. **AC-15.2** memuat atribusi sumber sesuai ketentuan penyedia. **AC-15.3** tautan tersedia dari panel hasil, detail, dan rekomendasi.

### Non-MVP
| ID | Nama | Prioritas |
|---|---|---|
| FR-16 | Tampilan PM10 informatif (tidak masuk skor) | Could |
| FR-17 | Fallback data udara berbasis model (Open-Meteo), berlabel "Data model" | **Should** (menutup cakupan stasiun terbatas) |
| FR-18 | Estimasi aktivitas statis (lokasi + durasi) | Could |
| FR-19 | Ekspor data pribadi | Future |
| FR-20 | Data lalu lintas | Future |
| FR-21 | Keberangkatan terjadwal dan forecast | Future |
| FR-22 | Moda jalan kaki dan sepeda | Future |
| FR-23 | Lokasi/rute favorit | Future |

---

## Bagian 6 — User Stories

| ID | User story | FR | Skenario kegagalan / data tidak tersedia |
|---|---|---|---|
| US-01 | Sebagai pengunjung, saya ingin melihat peta kualitas udara, sehingga saya tahu kondisi udara di area tertentu. | FR-01 | Sumber gagal tanpa cache → pesan error; tanpa stasiun → "tidak ada stasiun di area ini" |
| US-02 | Sebagai pengunjung, saya ingin melihat detail stasiun, sehingga saya tahu sumber dan kesegaran data. | FR-01, FR-04 | Data > 24 jam → ditandai kedaluwarsa dan tidak dipakai |
| US-03 | Sebagai pengunjung, saya ingin mencari asal dan tujuan, sehingga saya dapat merencanakan perjalanan. | FR-02 | Hasil kosong/geocoder gagal → opsi klik peta |
| US-04 | Sebagai pengunjung, saya ingin melihat beberapa alternatif rute, sehingga saya punya pilihan. | FR-03 | Satu rute → "tidak ada alternatif"; tidak ada rute → pesan jelas |
| US-05 | Sebagai pengunjung, saya ingin melihat estimasi paparan tiap rute beserta rinciannya, sehingga saya paham kontributor paparan. | FR-05, FR-09 | Cakupan < PAR-08 → "estimasi tidak tersedia" dengan alasan, bukan 0 |
| US-06 | Sebagai pengunjung, saya ingin membandingkan rute dan melihat alasan rekomendasi, sehingga saya dapat memutuskan trade-off waktu vs paparan. | FR-06 | Selisih < PAR-07 → "tidak signifikan"; semua estimasi tidak tersedia → urutan waktu saja |
| US-07 | Sebagai pengguna, saya ingin mengatur preferensi waktu vs paparan, sehingga rekomendasi sesuai kebutuhan saya. | FR-07 | Nilai di luar rentang → ditolak |
| US-08 | Sebagai pengunjung, saya ingin membaca rekomendasi tindakan, sehingga saya tahu langkah wajar. | FR-08 | Estimasi tidak tersedia → tanpa pesan kesehatan |
| US-09 | Sebagai calon pengguna, saya ingin mendaftar dan masuk, sehingga saya dapat menyimpan riwayat. | FR-10 | Email terdaftar; kata sandi lemah; kredensial salah |
| US-10 | Sebagai pengguna, saya ingin menyimpan dan melihat perjalanan dengan persetujuan, sehingga estimasinya masuk riwayat saya. | FR-11 | Tanpa persetujuan → ditolak; tanpa estimasi → tersimpan "tanpa estimasi"; riwayat kosong → ajakan |
| US-11 | Sebagai pengguna, saya ingin menghapus perjalanan dan akun saya, sehingga saya mengendalikan privasi saya. | FR-13 | Konfirmasi gagal → tidak terhapus |
| US-12 | Sebagai pengunjung, saya ingin diberi tahu jelas saat data tidak tersedia atau terbatas, sehingga saya tidak salah menafsirkan hasil. | FR-14 | Data simulasi → banner "DATA SIMULASI" |
| US-13 | Sebagai pengunjung, saya ingin membaca metodologi dan batasan, sehingga saya paham arti angka. | FR-15 | — |
| US-14 | Sebagai pengguna, saya ingin data saya tidak dapat dilihat pengguna lain, sehingga privasi terjaga. | FR-10, FR-11 | Akses data milik orang lain → tidak ditemukan; tanpa sesi → ditolak |

Skenario normal berupa Given-When-Then mengikuti AC pada Bagian 5.

---

## Bagian 7 — Non-Functional Requirements

Semua target kuantitatif adalah asumsi (ASM-08).

| ID | Kategori | Kebutuhan | Target |
|---|---|---|---|
| NFR-01 | Performance | Daftar stasiun | p95 ≤ 2 dtk dingin, ≤ 800 ms hangat |
| NFR-02 | Performance | `POST /api/routes/analyze` | p95 ≤ 8 dtk dingin, ≤ 3 dtk hangat (M-09) |
| NFR-03 | Availability | Gangguan API eksternal | Aplikasi tetap melayani fungsi yang tidak bergantung pada API yang gagal; degradasi sesuai FR-14 |
| NFR-04 | Availability | Ketahanan demo | Mode `DATA_MODE=simulation` dengan fixture berbanner "DATA SIMULASI" |
| NFR-05 | Security/Privacy | Lihat Bagian 13 | SEC-01..SEC-08 |
| NFR-06 | Reliability | Timeout dan retry | Geocoding 5 dtk, routing 8 dtk, udara 5 dtk; 1× retry |
| NFR-07 | Reliability | Penyimpanan perjalanan | Atomik; tidak ada data parsial |
| NFR-08 | Maintainability | Pemisahan logika | Logika estimasi/optimasi sebagai fungsi murni terpisah dari handler dan UI sehingga dapat diuji tanpa jaringan |
| NFR-09 | Maintainability | Konfigurasi | Semua PAR-xx di satu berkas konfigurasi; `.env.example` dan README |
| NFR-10 | Usability | Jumlah langkah | Analisis rute ≤ 4 aksi |
| NFR-11 | Accessibility | Dasar | Kontras memadai; warna tidak jadi satu-satunya penanda; label form; navigasi keyboard |
| NFR-12 | Data freshness | Label dan ambang | Fresh ≤ 3 jam; stale 3–24 jam; expired > 24 jam; cache stasiun 10 menit |
| NFR-13 | Error handling | Format | Satu envelope `{success, data, error, meta}`; pesan Indonesia; tanpa stack trace |
| NFR-14 | Compatibility | Browser dan layar | Dua versi terbaru Chrome, Firefox, Edge, Safari; responsif ≥ 360 px |

---

## Bagian 8 — Data Requirements dan Sumber Data

### 8.1 Data
| ID | Data | Sumber | Pembaruan | Resolusi | Missing data | Simpan / ambil |
|---|---|---|---|---|---|---|
| D-01 | Koordinat dan nama lokasi | Geocoder; klik peta | Per permintaan | Titik | Hasil kosong → pesan | Ambil; disimpan hanya pada perjalanan tersimpan |
| D-02 | Geometri rute | Mesin routing | Per permintaan | Jaringan jalan OSM | Tanpa rute → error | Ambil; polyline rute terpilih disimpan bila disimpan |
| D-03 | Jarak dan waktu tempuh | Mesin routing | Per permintaan | Per rute | — | Sama D-02 |
| D-04 | Lalu lintas | **Tidak tersedia di MVP** | — | — | Label "tanpa data kemacetan" | — |
| D-05 | PM2.5 (utama), PM10 (informatif) | WAQI (observasi); Open-Meteo (model, fallback) | Bergantung sumber; tidak diasumsikan per menit | Titik stasiun / grid kasar | `null`, bukan 0 | Cache memori; snapshot saat disimpan |
| D-06 | Waktu observasi dan lokasi stasiun | Sumber D-05 | Mengikuti D-05 | Per stasiun | Tanpa waktu → dianggap expired | Seperti D-05 |
| D-07 | Metadata sumber dan atribusi | Konfigurasi | Statis | — | — | Konstanta |
| D-08 | Riwayat perjalanan dan snapshot estimasi | Pengguna (dengan persetujuan) | Per simpan | Per perjalanan | `null` bila tidak tersedia | Database |
| D-09 | Preferensi pengguna | Pengguna | Saat diubah | — | Default | Database (A-02); browser (A-01) |

### 8.2 Evaluasi Kandidat API

> Isi kolom ini berasal dari pengetahuan umum penyusun dan **belum diverifikasi** ke dokumentasi resmi. Verifikasi (kuota, atribusi, skema, cakupan kota pilot) adalah langkah pertama roadmap. Tidak ada angka kuota yang boleh dianggap fakta sebelum itu.

| Layanan | Fungsi | Gratis / key | Kuota | Cakupan Indonesia | Catatan |
|---|---|---|---|---|---|
| WAQI (aqicn) | Stasiun udara (observasi) | Diduga gratis dengan token | TBD | Bergantung stasiun per kota; **cek kota pilot** | Nilai umumnya AQI, bukan µg/m³ mentah; atribusi diduga wajib |
| Open-Meteo Air Quality | Fallback data model bergrid | Diduga gratis non-komersial, tanpa key | TBD | Global, resolusi kasar | **Data model**, bukan observasi; wajib berlabel berbeda |
| OSRM demo publik | Routing + alternatif | Gratis, tanpa key | TBD; tidak untuk beban tinggi | Data OSM | Tanpa kemacetan real-time; diduga hanya profil mobil; jumlah alternatif tidak dijamin |
| OpenRouteService | Routing + alternatif (opsi lain) | Diduga key gratis | TBD (diduga ada kuota harian) | Data OSM | Opsi bila demo OSRM tidak memadai |
| Nominatim | Geocoding | Gratis, tanpa key (User-Agent identitas) | Diduga ≈ 1 req/dtk | Data OSM | Tidak untuk autocomplete; cache hasil |
| Tile OSM | Peta dasar | Gratis | Kebijakan penggunaan tile | Global | Cukup untuk demo; atribusi wajib |
| Penyedia lalu lintas | Kemacetan | Umumnya berkuota/berbayar | TBD | TBD | **Tidak dipilih** |

### 8.3 Pendekatan Spasial dan Ketidakpastian
MVP memakai **Inverse Distance Weighting (IDW)** dari stasiun terdekat (ALG-02): deterministik, dapat dijelaskan, tanpa data latih. Konsekuensi yang wajib dikomunikasikan:
1. IDW menghasilkan medan halus; puncak lokal tepi jalan tidak tertangkap.
2. Pada kota dengan sedikit stasiun, perbedaan paparan antar rute sebagian besar mencerminkan **perbedaan durasi**, bukan konsentrasi (RISK-03). Karena itu ada ambang signifikansi dan label keyakinan.
3. Ketidakpastian dikomunikasikan lewat `coverageRatio`, jarak stasiun terdekat, usia data, dan `confidenceLevel`.
4. Galat diukur lewat leave-one-station-out (TC-28), tidak diasumsikan.

---

## Bagian 9 — Business Rules dan Algoritma

### 9.1 Definisi
| Konsep | Definisi | Ditampilkan? |
|---|---|---|
| Konsentrasi polutan | Massa partikel per volume udara (µg/m³) | Ya (estimasi per segmen dan rata-rata) |
| **Indikator paparan (EI)** | Σ (konsentrasi estimasi × durasi), satuan µg/m³·menit | Ya (metrik utama) |
| Dosis inhalasi | Massa terhirup; butuh laju napas, aktivitas, infiltrasi kendaraan | **Tidak** dihitung dan tidak diklaim |
| Risiko kesehatan klinis | Dampak pada individu | **Tidak** dihitung dan tidak diklaim |

### 9.2 Business Rules
| ID | Aturan |
|---|---|
| BR-01 | Label tipe data wajib: "Observasi stasiun", "Estimasi sistem (interpolasi)", "Data model", "DATA SIMULASI". "Terkini" hanya bila `freshness = fresh`. Tidak ada klaim real-time |
| BR-02 | Data simulasi hanya aktif saat `DATA_MODE=simulation` dan selalu berbanner |
| BR-03 | Data tidak tersedia tidak pernah diperlakukan sebagai 0 |
| BR-04 | Analisis oleh pengunjung tidak menyimpan asal/tujuan di server |
| BR-05 | Perjalanan disimpan hanya atas aksi eksplisit pengguna yang telah memberi persetujuan |
| BR-06 | Perbandingan rute hanya memakai PM2.5; PM10 informatif |
| BR-07 | Perjalanan "tanpa estimasi" boleh disimpan tetapi tidak masuk ringkasan |
| BR-08 | Data dari sumber model tidak boleh digabung dengan observasi tanpa label dan penurunan keyakinan |

### 9.3 Parameter Awal (semua asumsi)
| ID | Parameter | Nilai |
|---|---|---|
| PAR-01 | Panjang segmen | 500 m |
| PAR-02 | Radius pencarian stasiun | 10 km |
| PAR-03 | Jumlah stasiun terdekat (K) | 3 |
| PAR-04 | Batas fresh | ≤ 3 jam |
| PAR-05 | Batas expired | > 24 jam |
| PAR-06 | Ambang jarak "dekat" | ≤ 3 km |
| PAR-07 | Ambang signifikansi selisih EI | 5% |
| PAR-08 | Cakupan minimum | `coverageRatio` ≥ 0,2 |
| PAR-09 | Batas tambahan waktu default | +30% |
| PAR-10 | Ambang duplikat rute | tumpang tindih > 90% |
| PAR-11 | IDW: pangkat p; jarak anti-singularitas ε | p = 2; ε = 100 m |
| PAR-12 | TTL cache stasiun | 10 menit |
| PAR-13 | Timeout eksternal | geocoding 5 dtk; routing 8 dtk; udara 5 dtk |
| PAR-14 | Durasi "perjalanan panjang" (RULE-04) | ≥ 45 menit |

### 9.4 ALG-01 — Estimasi Paparan Perjalanan
**Input:** geometri, durasi total T (menit), stasiun ternormalisasi. **Output:** EI, avgPm25, kategori, coverageRatio, confidenceLevel, maxDataAgeMinutes, segmen.

1. **Segmentasi:** bagi geometri per PAR-01; titik tengah segmen = titik evaluasi.
2. **Waktu:** Δt_i = T × L_i / L_total (kecepatan dianggap homogen; keterbatasan dinyatakan).
3. **Konsentrasi:** C_i dari ALG-02; segmen tanpa stasiun valid = *tanpa data*.
4. **Agregasi:** coverageRatio = Σ Δt_i (berdata) / T. Jika ≥ PAR-08: avgPm25 = Σ(C_i·Δt_i) / Σ Δt_i (berdata); EI = avgPm25 × T (segmen tanpa data diimputasi rata-rata rute; `isPartiallyImputed = true` bila coverage < 1). Jika < PAR-08: EI = `null`.
5. **Kategori:** avgPm25 dipetakan ke kategori memakai tabel breakpoint yang versinya ditetapkan (OQ-05).
6. **Keyakinan:** *High* bila coverage ≥ 0,8, ≥ 50% waktu berstasiun ≤ PAR-06, dan semua data fresh; *Medium* bila coverage ≥ 0,5 dan tanpa data expired; *Low* bila coverage ≥ PAR-08; *tidak tersedia* bila di bawahnya. Data dari sumber model membatasi keyakinan maksimum pada Medium (BR-08).
7. **Kesegaran:** stasiun expired dikeluarkan; stale dipakai dan mencegah High; tanpa ekstrapolasi temporal.

**Edge cases:** durasi 0; rute < 500 m; konsentrasi 0 (valid); AQI di atas skala tabel (dikunci batas atas); stasiun hanya melaporkan PM10; dua stasiun berkoordinat sama.
**Pengujian:** TC-01..TC-07, TC-24, TC-25, TC-28.

### 9.5 ALG-02 — Interpolasi IDW
Ambil stasiun dengan PM2.5 tersedia, tidak expired, jarak ≤ PAR-02; pilih K terdekat. Jika ada yang berjarak < ε, pakai nilainya. Selain itu w_j = 1/d_j^p dan C = Σ w_j C_j / Σ w_j. Tanpa stasiun → tanpa data. **Edge cases:** satu stasiun (nilai stasiun itu); dua stasiun berjarak sama (rata-rata); titik tepat di stasiun. **Pengujian:** TC-03, TC-04, TC-28.

### 9.6 ALG-03 — Perbandingan dan Pemilihan Rute
**Pendekatan:** perbandingan kandidat multi-kriteria dengan skor gabungan berbobot dari preferensi pengguna, dibatasi batas waktu tambahan, dilengkapi penandaan Pareto. Sistem tidak membangun graf jalan sendiri; kandidat berasal dari mesin routing.

1. Himpunan *berestimasi* = rute dengan EI tersedia. Jika kosong → urut waktu saja.
2. Batas waktu: T_r ≤ T_min × (1 + maxExtra%). Rute tercepat selalu layak.
3. Rasio: Tn_r = T_r / T_min; En_r = E_r / E_min. Jika E_min = 0 → En_r = 1.
4. Skor: (1 − we)·Tn_r + we·En_r; terendah menang; seri → EI lebih rendah, lalu waktu lebih rendah.
5. Signifikansi: jika (E_tercepat − E_terpilih)/E_tercepat < PAR-07 → rekomendasikan tercepat, pesan "tidak signifikan".
6. Pareto: rute terdominasi bila ada rute lain dengan waktu dan EI keduanya ≤ dan minimal satu lebih kecil.
7. Jika salah satu rute berkeyakinan Low → tambahkan peringatan bahwa perbedaan mungkin tidak bermakna.
8. Teks alasan dibangun dari template memakai angka dari tabel yang sama (M-08).

**Contoh ilustratif (bukan data nyata):** A: 20 menit, rata-rata 30 → EI 600. B: 23 menit, rata-rata 22 → EI 506. Tn_A = 1; Tn_B = 1,15; En_A ≈ 1,186; En_B = 1.
- we = 0,5: skor A ≈ 1,093; B = 1,075 → **B** (+3 menit; EI −15,7%).
- we = 0,2: skor A ≈ 1,037; B = 1,12 → **A**.

Bobot preset (0 / 0,5 / 0,8) dan ambang adalah asumsi awal, bukan nilai optimal. **Pengujian:** TC-08..TC-12, TC-32.

### 9.7 ALG-04 — Rekomendasi Berbasis Aturan
| Rule | Pemicu | Severity | Intisari pesan |
|---|---|---|---|
| RULE-01 | Kategori rata-rata "Baik" | info | Kondisi estimasi baik |
| RULE-02 | Kategori "Sedang" | info | Pertimbangkan membatasi aktivitas luar ruang lama bagi yang merasa sensitif |
| RULE-03 | Kategori di atas "Sedang" | perhatian/waspada | Pertimbangkan menurunkan paparan: rute berpaparan lebih rendah, kurangi durasi, tunda perjalanan non-esensial |
| RULE-04 | Durasi ≥ PAR-14 dan kategori ≥ "Sedang" | perhatian | Perjalanan panjang menambah akumulasi indikator paparan |
| RULE-05 | Rute rekomendasi menurunkan EI ≥ 10% dengan tambahan ≤ 10 menit | info | Sebut selisih menit dan persen |
| RULE-06 | Keyakinan Low atau data stale | info | Gunakan sebagai gambaran kasar |
| RULE-07 | Estimasi tidak tersedia | info | Data tidak tersedia; tanpa rekomendasi berbasis estimasi |

(Aturan "di atas pola riwayat pengguna" dari v0.1 dihapus untuk hackathon.) Tidak ada diagnosis, penyakit, atau dosis. Teks akhir terkait kesehatan harus bersumber dari panduan resmi otoritas lingkungan/kesehatan dan dicantumkan di metodologi (OQ-06); pesan di atas hanya intisari. **Pengujian:** TC-13.

---

## Bagian 10 — UI/UX Requirements

### 10.1 Halaman
| ID | Halaman | Aktor | FR | Prioritas |
|---|---|---|---|---|
| P-01 | Beranda | A-01, A-02 | FR-15 (pengantar) | Must |
| P-02 | Peta Kualitas Udara | A-01, A-02 | FR-01, FR-04 | Must |
| P-03 | Perencanaan dan Perbandingan Rute (termasuk panel detail, rekomendasi, preferensi, tombol simpan) | A-01, A-02 | FR-02,03,05,06,07,08,09,11 | Must |
| P-04 | Login dan Registrasi (satu halaman dengan dua mode) | A-01 | FR-10 | Should |
| P-05 | Riwayat (daftar; ringkasan pola bila FR-12 dikerjakan) | A-02 | FR-11, FR-12, FR-13 | Should |
| P-06 | Detail Perjalanan Tersimpan | A-02 | FR-09, FR-11 | Should |
| P-07 | Pengaturan (preferensi, persetujuan, hapus data/akun) | A-02 | FR-07, FR-13 | Should |
| P-08 | Metodologi dan Disclaimer | A-01, A-02 | FR-15 | Must |

> Penomoran halaman disederhanakan dibanding v0.1 (login dan registrasi digabung).

### 10.2 Spesifikasi Halaman
| Halaman | Komponen | Loading | Kosong | Error | Validasi | Endpoint |
|---|---|---|---|---|---|---|
| P-02 | Peta, kotak cari, legenda, panel detail stasiun, atribusi | Indikator di atas peta | "Tidak ada stasiun di area ini" | Pesan + data cache berlabel + coba lagi | Query 3–100 | API-01 |
| P-03 | Kolom asal/tujuan + kandidat; peta dengan rute A/B/C; preset dan slider; tombol Analisis; tabel perbandingan; kartu rekomendasi + alasan; panel detail; panel tindakan; tombol Simpan; label "Estimasi — bukan dosis" | Status bertahap ("Mencari rute… Mengambil data udara… Menghitung") | Petunjuk 3 langkah | Pesan sesuai matriks FR-14; peta tetap dapat dipakai | Asal dan tujuan wajib; jarak > 100 m; area cakupan; rentang preferensi | API-02, API-04 (+ API-06 simpan) |
| P-04 | Email, kata sandi, (mode daftar: konfirmasi, indikator syarat) | Tombol nonaktif | — | Pesan generik/spesifik validasi | Email valid; kata sandi ≥ 8 huruf+angka | Supabase Auth |
| P-05 | Pemilih rentang, kartu ringkasan, daftar terpaginasi, hapus | Skeleton | "Belum ada perjalanan tersimpan" + tautan P-03 | Pesan; tidak login → ke P-04 | Parameter rentang diizinkan | API-05 |
| P-06 | Peta rute, panel detail snapshot, baseline vs tercepat, hapus | Skeleton | — | "Perjalanan tidak ditemukan" | — | API-05 |
| P-07 | Preferensi, saklar persetujuan, hapus semua, hapus akun | — | — | Pesan per aksi | Rentang preferensi; konfirmasi hapus akun | API-07 |
| P-08, P-01 | Konten statis | — | — | — | — | — |

### 10.3 Navigasi dan Konsistensi
**Alur:** Beranda → (Peta | Rute) → Hasil → (Login) → Simpan → Riwayat → Detail; Pengaturan dari header pengguna; Metodologi dari footer dan panel estimasi.

**Aturan konsistensi lintas peta, perbandingan, dan detail:**
1. Skala warna kategori identik pada marker stasiun, garis segmen rute, dan badge tabel.
2. Label rute A/B/C sama di tabel, peta, dan teks alasan.
3. Satuan dan pembulatan sama (µg/m³ satu desimal; µg/m³·menit bilangan bulat; durasi dalam menit).
4. Label tipe data dan sumber selalu menyertai angka.
5. Waktu observasi disimpan UTC dan ditampilkan di zona waktu perangkat dengan zona eksplisit.
6. Angka di teks rekomendasi diambil dari objek hasil yang sama dengan tabel.

---

## Bagian 11 — Data Model dan Database

### 11.1 Keputusan Entitas
| Kandidat | Keputusan | Alasan |
|---|---|---|
| Users | **Dikelola Supabase Auth** (`auth.users`), tidak dibuat tabel kredensial sendiri | Menghemat waktu dan mengurangi risiko keamanan |
| Preferensi + persetujuan | **Tabel `profiles`** (E-01), relasi 1:1 ke pengguna | Hanya tiga atribut; tidak perlu tabel terpisah |
| Trip + estimasi | **Satu tabel `trips`** (E-02) | Relasi 1:1, snapshot dibuat sekali |
| Segmen estimasi | **Kolom JSON** pada `trips` | Hanya dibaca bersama detail satu perjalanan |
| Rute favorit | **Tidak dibuat** (Future FR-23) | Di luar kebutuhan MVP |
| Cache data lingkungan | **Tidak dibuat; cache memori/edge** | Data sementara, dapat diambil ulang |

**Penyimpanan:** geometri hanya rute **terpilih** dari perjalanan yang disimpan dengan persetujuan (polyline terenkode); snapshot lingkungan hanya ringkasan stasiun yang dipakai (di JSON); hasil estimasi disimpan sebagai snapshot dengan `algorithm_version`. Ringkasan 7/30 hari tidak disimpan, dihitung saat diminta.

### 11.2 E-01 `profiles`
| Kolom | Tipe | Null | Constraint |
|---|---|---|---|
| `user_id` | UUID | NOT NULL | PK, FK → `auth.users` ON DELETE CASCADE |
| `exposure_weight` | NUMERIC(3,2) | NOT NULL | DEFAULT 0.50; CHECK 0–1 |
| `max_extra_time_percent` | SMALLINT | NULL | NULL = tidak dibatasi; DEFAULT 30; CHECK 0–100 |
| `history_consent` | BOOLEAN | NOT NULL | DEFAULT FALSE |
| `consent_updated_at` | TIMESTAMPTZ | NULL | — |
| `created_at` | TIMESTAMPTZ | NOT NULL | DEFAULT now() |

### 11.3 E-02 `trips`
| Kolom | Tipe | Null | Constraint |
|---|---|---|---|
| `trip_id` | UUID | NOT NULL | PK, DEFAULT gen_random_uuid() |
| `user_id` | UUID | NOT NULL | FK → `auth.users` ON DELETE CASCADE |
| `origin_label`, `destination_label` | TEXT | NOT NULL | — |
| `origin_lat/lng`, `destination_lat/lng` | NUMERIC(9,6) | NOT NULL | CHECK rentang koordinat |
| `route_polyline` | TEXT | NOT NULL | polyline rute terpilih |
| `distance_m`, `duration_s` | INTEGER | NOT NULL | CHECK > 0 |
| `analyzed_at` | TIMESTAMPTZ | NOT NULL | juga waktu keberangkatan (ASM-05) |
| `exposure_index_pm25`, `avg_pm25` | NUMERIC | NULL | NULL = tidak tersedia |
| `aqi_category` | TEXT | NULL | — |
| `confidence_level` | TEXT | NOT NULL | CHECK IN ('high','medium','low','unavailable') |
| `coverage_ratio` | NUMERIC(3,2) | NULL | CHECK 0–1 |
| `data_source` | TEXT | NOT NULL | — |
| `fastest_duration_s` | INTEGER | NOT NULL | baseline |
| `fastest_exposure_index_pm25` | NUMERIC | NULL | baseline |
| `was_recommended` | BOOLEAN | NOT NULL | — |
| `used_exposure_weight` | NUMERIC(3,2) | NOT NULL | snapshot preferensi |
| `estimate_details` | JSONB | NULL | segmen + stasiun dipakai |
| `algorithm_version` | TEXT | NOT NULL | — |
| `created_at` | TIMESTAMPTZ | NOT NULL | DEFAULT now() |

Indeks `(user_id, created_at DESC)`. **Row Level Security:** pengguna hanya dapat SELECT/INSERT/DELETE baris dengan `user_id = auth.uid()`. **Retensi:** dapat dihapus pengguna kapan saja; retensi otomatis 90 hari adalah Could (jika tidak dikerjakan, dinyatakan di halaman metodologi/privasi).

---

## Bagian 12 — Integrasi API Eksternal

| Integrasi | Titik pemanggilan | Parameter | Timeout / kegagalan | Cache | Key | Alternatif |
|---|---|---|---|---|---|---|
| Geocoding (Nominatim) | route handler `GET /api/geocode` | `q`, batas hasil, bias kota pilot | 5 dtk; 1× retry; gagal → klik peta | 24 jam per query ternormalisasi | Tidak; wajib User-Agent identitas | Geocoder lain (TBD) |
| Peta dasar (tile OSM) | langsung dari browser via Leaflet | URL tile | Tile gagal → pesan; marker/rute tetap tampil | Cache browser | Tidak | Penyedia tile lain |
| Routing (OSRM demo / ORS) | `routingService` ← `POST /api/routes/analyze` | Koordinat, opsi alternatif, geometri penuh | 8 dtk; 1× retry; gagal → tanpa estimasi | Pasangan koordinat dibulatkan, 5 menit | OSRM tidak; ORS ya (server only) | Pertukaran OSRM↔ORS |
| Udara (WAQI) | `airQualityService` ← API-01, API-04 | bbox atau titik+radius | 5 dtk; 1× retry; gagal → cache; tanpa cache → tidak tersedia | 10 menit | **Ya**, server only | Open-Meteo (FR-17); fixture simulasi |
| Udara fallback (Open-Meteo) | `airQualityService` | Titik grid | Sama | 10 menit | Tidak | Fixture |
| Lalu lintas | — | — | — | — | — | **Tidak ada di MVP** |

**Tanggung jawab backend (route handler Next.js):**
1. Menyimpan token di environment variable platform hosting; hanya `.env.example` di repositori; tidak ada token di kode frontend.
2. Semua pemanggilan WAQI/ORS dan geocoder lewat route handler server.
3. Menormalisasi respons beragam sumber ke skema internal (FR-04); skema vendor tidak bocor ke klien.
4. Menerapkan timeout, retry, dan cache untuk menghormati kuota penyedia.
5. Tidak mencatat koordinat asal/tujuan pada log.
6. Menampilkan atribusi sesuai ketentuan penyedia.
7. Adapter terisolasi sehingga mengganti penyedia tidak mengubah logika estimasi.

---

## Bagian 13 — Security dan Privacy

| ID | Kebutuhan | Spesifikasi |
|---|---|---|
| SEC-01 | Registrasi, login, logout | Supabase Auth; validasi client dan server; kata sandi ≥ 8 huruf+angka; tanpa verifikasi email (ASM-09) |
| SEC-02 | Kredensial | Aplikasi tidak menyimpan kata sandi; hashing dikelola penyedia auth |
| SEC-03 | Proteksi endpoint | Endpoint privat memeriksa sesi; endpoint publik hanya mengembalikan data non-personal |
| SEC-04 | Isolasi data | RLS pada `trips` dan `profiles`; query tidak pernah menerima `user_id` dari klien |
| SEC-05 | Validasi input | Tipe, panjang, rentang koordinat, rentang preferensi di server pada semua parameter |
| SEC-06 | XSS/Injeksi | Teks dari API eksternal dan input pengguna ditampilkan sebagai teks, bukan HTML mentah; query berparameter |
| SEC-07 | Rahasia | Token API dan kunci service role hanya di server/environment; kunci service role tidak pernah di frontend |
| SEC-08 | Penyalahgunaan | Cache dan batas ukuran body; rate limit sederhana pada endpoint analisis jika waktu memungkinkan (Could) |
| SEC-09 | Persetujuan | Penyimpanan riwayat butuh persetujuan eksplisit yang dapat ditarik; pengunjung tidak menyimpan lokasi di server |
| SEC-10 | Penghapusan | Hapus perjalanan (satu/semua) dan hapus akun bersifat permanen |
| SEC-11 | Data lokasi | Hanya data minimum; log tanpa koordinat; HTTPS dari platform hosting |

---

## Bagian 14 — Traceability Matrix

Endpoint: API-01 `GET /api/air-quality/stations`; API-02 `GET /api/geocode`; API-04 `POST /api/routes/analyze` (mengembalikan rute, estimasi, rekomendasi, detail); API-05 `GET /api/trips`, `GET /api/trips/:id`, `DELETE /api/trips/:id`, `DELETE /api/trips`; API-06 `POST /api/trips`; API-07 `GET/PUT /api/preferences`; API-08 `PATCH /api/account/consent`, `DELETE /api/account`; API-09 `GET /api/exposure/summary` (Could). Autentikasi lewat Supabase Auth (tanpa endpoint buatan sendiri).

| Problem | Goal | FR | US | AC | Halaman | Entitas | Endpoint | Modul | Test Case |
|---|---|---|---|---|---|---|---|---|---|
| PR-01, PR-05 | G-01 | FR-01 | US-01, US-02 | AC-01.1–01.4 | P-02 | — | API-01 | airQualityService | TC-14, TC-33 |
| PR-03 | G-03 | FR-02 | US-03 | AC-02.1–02.4 | P-03 | — | API-02 | geocodingService | TC-16, TC-21 |
| PR-03 | G-03 | FR-03 | US-04 | AC-03.1–03.5 | P-03 | — | API-04 | routingService | TC-12, TC-15, TC-26 |
| PR-01, PR-05 | G-01, G-02 | FR-04 | US-02, US-05 | AC-04.1–04.5 | P-02, P-03 | — | API-01, API-04 | airQualityService, aqiConversion | TC-05, TC-06, TC-14, TC-24, TC-25 |
| PR-02 | G-02 | FR-05 | US-05 | AC-05.1–05.5 | P-03 | E-02 (snapshot) | API-04 | exposureService, interpolation | TC-01–04, TC-07, TC-24, TC-25, TC-28 |
| PR-03 | G-03 | FR-06 | US-06 | AC-06.1–06.5 | P-03 | — | API-04 | routeScoring | TC-08–11, TC-32 |
| PR-03 | G-03 | FR-07 | US-07 | AC-07.1–07.4 | P-03, P-07 | E-01 | API-07 | preferences | TC-09, TC-21 |
| PR-04 | G-04 | FR-08 | US-08 | AC-08.1–08.4 | P-03, P-06 | — | API-04 | recommendation | TC-13 |
| PR-02, PR-05 | G-02 | FR-09 | US-05 | AC-09.1–09.3 | P-03, P-06 | E-02 | API-04, API-05 | exposureService | TC-01, TC-32 |
| PR-06 | G-05 | FR-10 | US-09, US-14 | AC-10.1–10.4 | P-04 | auth.users | Supabase Auth | auth middleware | TC-18, TC-21 |
| PR-06 | G-05 | FR-11 | US-10, US-14 | AC-11.1–11.4 | P-03, P-05, P-06 | E-01, E-02 | API-05, API-06 | tripService | TC-19, TC-20, TC-22, TC-23 |
| PR-06 | G-05 | FR-12 | — (Could) | AC-12.1–12.2 | P-05 | E-02 | API-09 | summaryService | TC-34 |
| PR-06 | G-05 | FR-13 | US-11 | AC-13.1–13.3 | P-05, P-07 | E-01, E-02 | API-05, API-08 | accountService | TC-20, TC-23 |
| PR-05 | G-01 | FR-14 | US-12 | AC-14.1–14.3 | Semua | — | Semua | errorHandler, adapter | TC-14–16, TC-24, TC-25 |
| PR-05 | G-01 | FR-15 | US-13 | AC-15.1–15.3 | P-08 | — | — | halaman statis | TC-35 |

---

## Bagian 15 — MVP dan Prioritas

| Kelompok | Fitur |
|---|---|
| **Must Have** (inti demo) | FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-07, FR-08, FR-09, FR-14, FR-15 |
| **Should Have** | FR-10, FR-11, FR-13 (akun, riwayat, kontrol data), FR-17 (fallback data model) |
| **Could Have** | FR-12 (ringkasan pola), FR-16 (PM10), FR-18, rate limit sederhana, retensi otomatis |
| **Future Development** | FR-19..FR-23, wearable/IoT, ML |

**Batas MVP terkecil yang tetap membuktikan manfaat** (semua tanpa login):
1. Cari asal dan tujuan di kota pilot (FR-02)
2. 1–3 alternatif rute (FR-03)
3. Data stasiun dan kesegarannya (FR-04)
4. Estimasi paparan beserta keyakinan (FR-05)
5. Perbandingan sesuai preferensi (FR-06, FR-07)
6. Rekomendasi beralasan dan tindakan non-klinis (FR-06, FR-08, FR-09)

Jika waktu berlebih: tambahkan FR-10/FR-11 (login dan simpan riwayat) lalu FR-17. Jika waktu kurang: kerjakan FR-04 hanya dari satu sumber dan tampilkan keterbatasan di metodologi.

---

## Bagian 16 — Testing Strategy

| Jenis | Tujuan | Contoh skenario |
|---|---|---|
| Unit — estimasi | ALG-01/02 benar dan deterministik | Konsentrasi konstan; segmentasi; stasiun tunggal |
| Unit — perbandingan | ALG-03 sesuai aturan | Contoh numerik Bagian 9.6; batas waktu; signifikansi |
| Unit — rekomendasi | Aturan terpicu tepat | Tabel kondisi → RULE |
| Integrasi | Adapter tahan variasi dan kegagalan | Fixture rekaman; timeout; 429 |
| API | Kontrak dan validasi | Koordinat tidak valid; terlalu dekat; di luar cakupan |
| Database/RLS | Constraint dan isolasi | Pengguna A tidak dapat membaca/menghapus data B |
| Validasi input | Client dan server konsisten | Form login dan pencarian |
| Missing/expired data | Perilaku bukan 0 | Tanpa PM2.5; stasiun 2 jam, 10 jam, 30 jam |
| Usability | Kemudahan dan pemahaman | 3 tugas pada 3–5 orang |
| Evaluasi estimasi | Ukur galat tanpa klaim sebelum uji | Leave-one-station-out |

| ID | Jenis | Skenario | Hasil diharapkan | FR |
|---|---|---|---|---|
| TC-01 | Unit | 20 µg/m³ konstan, 10 menit | EI = 200; avg = 20 | FR-05, FR-09 |
| TC-02 | Unit | Rute 1,2 km | 500/500/200 m; waktu proporsional | FR-05 |
| TC-03 | Unit | IDW: satu stasiun; dua berjarak sama; stasiun < 100 m | Nilai stasiun; rata-rata; nilai langsung | FR-05 |
| TC-04 | Unit | Tidak ada stasiun dalam radius | Tanpa data; coverage turun; bukan 0 | FR-05 |
| TC-05 | Unit | Kesegaran pada 3 jam dan 24 jam | Klasifikasi sesuai PAR-04/05 | FR-04 |
| TC-06 | Unit | Konversi AQI→µg/m³ pada nilai batas | Sesuai tabel breakpoint terpilih | FR-04 |
| TC-07 | Unit | Aturan keyakinan | Sesuai ALG-01 langkah 6 | FR-05 |
| TC-08 | Unit | Contoh A/B, we = 0,5 dan 0,2 | B lalu A | FR-06 |
| TC-09 | Unit | Batas tambahan waktu | Rute melebihi batas tidak direkomendasikan | FR-06, FR-07 |
| TC-10 | Unit | Selisih EI < 5% | Tercepat + "tidak signifikan" | FR-06 |
| TC-11 | Unit | Satu rute tanpa estimasi | Keluar dari perbandingan paparan, tetap tampil | FR-06 |
| TC-12 | Unit | Satu rute saja | "Tidak ada alternatif" | FR-03 |
| TC-13 | Unit | Tabel kondisi RULE-01..07 | Pesan sesuai; ≤ 3; tanpa diagnosis | FR-08 |
| TC-14 | Integrasi | Adapter udara: fixture, timeout, error, field hilang | Normalisasi benar; fallback; `null` | FR-01, FR-04, FR-14 |
| TC-15 | Integrasi | Adapter routing: banyak rute, satu, tidak ada, timeout | Perilaku FR-03/14 | FR-03, FR-14 |
| TC-16 | Integrasi | Adapter geocoding: hasil, kosong, 429, timeout | Perilaku FR-02/14 | FR-02, FR-14 |
| TC-17 | API | `POST /api/routes/analyze` valid, koordinat tidak valid, terlalu dekat, luar cakupan | 200 / 400 / 400 / peringatan | FR-03, FR-05 |
| TC-18 | Auth | Daftar dan login: duplikat, sandi lemah, kredensial salah, logout | Sesuai AC-10.x | FR-10 |
| TC-19 | API | Simpan perjalanan tanpa sesi / tanpa persetujuan | Ditolak | FR-11 |
| TC-20 | Database | Constraint CHECK/FK; cascade hapus akun | Pelanggaran ditolak; cascade jalan | FR-11, FR-13 |
| TC-21 | Validasi | Pencarian, preferensi, login | Client dan server konsisten | FR-02, FR-07, FR-10 |
| TC-22 | RLS | Pengguna A mengakses/menghapus perjalanan B | Tidak ditemukan/ditolak | FR-11 |
| TC-23 | Privasi | Analisis anonim; hapus semua; hapus akun; log | Tidak ada baris tersimpan; terhapus; log tanpa koordinat | FR-11, FR-13 |
| TC-24 | Missing data | Tanpa stasiun; PM2.5 tidak ada; parsial | Sesuai matriks FR-14 | FR-05, FR-14 |
| TC-25 | Kedaluwarsa | Semua stasiun > 24 jam | Estimasi tidak tersedia | FR-05, FR-14 |
| TC-26 | Edge rute | Rute < 500 m; asal = tujuan; titik di laut; luar area | Validasi/peringatan sesuai | FR-03 |
| TC-27 | Usability | 3 tugas pada 3–5 orang + pertanyaan pemahaman | M-11, M-12 tercatat | Semua |
| TC-28 | Evaluasi | Leave-one-station-out pada data kota pilot | MAE/RMSE dilaporkan apa adanya | FR-05 |
| TC-29 | Performa | p95 endpoint utama | Memenuhi NFR-01/02 | NFR |
| TC-32 | Konsistensi | Angka teks alasan = tabel; label rute sama | 100% cocok | FR-06, FR-09 |
| TC-33 | E2E manual | Marker, warna, detail stasiun | Sesuai AC-01.x | FR-01 |
| TC-34 | Unit | Ringkasan 7/30 hari (jika dikerjakan) | Total konsisten dengan riwayat | FR-12 |
| TC-35 | Konten | Halaman metodologi memuat definisi, atribusi, batasan | Checklist terpenuhi | FR-15 |

(TC-30 dan TC-31 dari v0.1 — uji abuse dan injeksi — dilepas dari lingkup wajib hackathon; SEC-06 tetap berlaku sebagai prinsip.) Tidak ada klaim akurasi sebelum TC-28 dijalankan.

---

## Bagian 17 — Risiko, Asumsi, Keputusan, dan Open Questions

### 17.1 Fakta dari Sumber
| ID | Fakta | Sumber |
|---|---|---|
| F-01 | Tenggat pengumpulan hackathon: 16 Oktober 2026 | Pernyataan pengguna |
| F-02 | Dua fokus produk dan daftar In/Out of Scope | REF-01 |
| F-03 | Stack yang direkomendasikan bersifat usulan; aturan hackathon belum dilampirkan | REF-03 (belum ada) |

### 17.2 Keputusan Produk
| ID | Keputusan |
|---|---|
| DEC-01 | Stack: Next.js (frontend + route handler), Supabase (Auth + Postgres + RLS), Vercel, Leaflet |
| DEC-02 | Metrik paparan memakai konsentrasi estimasi (µg/m³) hasil konversi AQI dengan tabel breakpoint terpilih |
| DEC-03 | IDW tanpa klaim resolusi tingkat jalan |
| DEC-04 | Optimasi: skor berbobot rasio + batas waktu + signifikansi + Pareto |
| DEC-05 | Dua tabel (`profiles`, `trips`) dengan RLS; cache di memori/edge |
| DEC-06 | Routing: OSRM demo atau ORS; tanpa kemacetan |
| DEC-07 | Satu kota pilot; fallback model berlabel bila stasiun terbatas |
| DEC-08 | Auth dan riwayat berprioritas Should; alur inti tanpa login |

### 17.3 Risiko
| ID | Risiko | Dampak | Penyelesaian |
|---|---|---|---|
| RISK-01 | Stasiun jarang/tidak ada di kota pilot | Estimasi tidak tersedia/berkeyakinan rendah | Cek cakupan lebih dulu; pilih kota bercakupan baik; fallback model berlabel |
| RISK-02 | Sumber memberi AQI, bukan µg/m³ | Nilai turunan | Tetapkan versi breakpoint; tampilkan "diturunkan dari AQI" |
| RISK-03 | Perbedaan konsentrasi antar rute kecil | Klaim "rute lebih bersih" menyesatkan | Ambang signifikansi, label keyakinan, pelaporan jujur |
| RISK-04 | Tanpa kemacetan real-time | Waktu terlalu optimis | Label "tanpa kemacetan"; Future FR-20 |
| RISK-05 | Kuota/kebijakan API gratis | Gagal saat demo atau pelanggaran ketentuan | Cache, atribusi, ORS sebagai alternatif, fixture berlabel |
| RISK-06 | API down saat penjurian/demo | Demo gagal | Mode simulasi berbanner; rekam video demo cadangan |
| RISK-07 | Estimasi ≠ paparan aktual | Salah tafsir | Definisi tegas, disclaimer di setiap hasil |
| RISK-08 | Privasi lokasi | Kepercayaan | Persetujuan, minimisasi, log tanpa koordinat, RLS |
| RISK-09 | Waktu sangat terbatas | Fitur tidak selesai | Pegang batas MVP terkecil; Should/Could hanya bila inti selesai |
| RISK-10 | Pesan kesehatan tanpa dasar | Klaim berlebihan | Teks dari panduan resmi (OQ-06); tanpa diagnosis/dosis |
| RISK-11 | Zona waktu observasi salah tafsir | Usia data keliru | Normalisasi UTC; TC-05 |
| RISK-12 | Atribusi/lisensi sumber terlewat | Pelanggaran ketentuan | Verifikasi di langkah 1 roadmap; tampilkan atribusi |
| RISK-13 | Aturan hackathon membatasi stack/format | Rework | Konfirmasi OQ-01 sebelum membangun |

### 17.4 Pertanyaan Terbuka
| ID | Pertanyaan | Rekomendasi awal |
|---|---|---|
| OQ-01 | Aturan hackathon: batasan teknologi, kriteria penilaian, format dan jam pengumpulan? | Baca aturan sebelum mulai; sesuaikan DEC-01 bila perlu |
| OQ-02 | Kota pilot? | Tentukan setelah cek cakupan stasiun |
| OQ-03 | Kuota dan atribusi WAQI, Open-Meteo, OSRM/ORS, Nominatim? | Verifikasi dokumentasi resmi di langkah 1 |
| OQ-04 | OSRM demo atau ORS untuk routing? | Uji OSRM demo dulu; ORS bila alternatif tidak memadai |
| OQ-05 | Versi tabel breakpoint AQI? | Pilih satu, catat di konfigurasi dan metodologi |
| OQ-06 | Sumber resmi teks rekomendasi kesehatan? | Rujuk panduan otoritas lingkungan/kesehatan |
| OQ-07 | Apakah FR-17 (fallback model) dikerjakan? | Ya bila cakupan stasiun kota pilot lemah |
| OQ-08 | Format pengumpulan (repo, video, tautan deploy, slide)? | Siapkan ketiganya (Lampiran D) |

---

## Bagian 18 — Roadmap Implementasi

Roadmap berbasis dependensi. Kerangka hari mengikuti tenggat 16 Oktober (sekitar tiga hari kerja; jam pasti TBD). **Tidak ada pembagian tugas per orang.**

| Tahap | Aktivitas | Deliverable | Kriteria selesai | Bergantung pada | Kerangka waktu |
|---|---|---|---|---|---|
| 1 | Validasi aturan dan API | Catatan OQ-01..05; fixture respons nyata tiap API | Kota pilot dan sumber data diputuskan | — | Hari 1 awal |
| 2 | Setup proyek | Repositori, proyek Next.js, Vercel terhubung, `.env.example`, Supabase dibuat | Aplikasi kosong ter-deploy | 1 | Hari 1 |
| 3 | Backend dasar dan adapter | Adapter udara/routing/geocoding, cache, errorHandler | TC-14..16 lulus dengan fixture | 1, 2 | Hari 1 |
| 4 | Logika estimasi dan optimasi | Fungsi murni ALG-01..04 | TC-01..13 lulus tanpa jaringan | 3 | Hari 1–2 |
| 5 | REST API analisis | API-01, API-02, API-04 | TC-17 lulus | 3, 4 | Hari 2 |
| 6 | Frontend inti | P-01, P-02, P-03, P-08 | Alur tanpa login berjalan end-to-end; TC-33 | 5 | Hari 2 |
| 7 | Auth dan riwayat (Should) | P-04..P-07, tabel dan RLS, simpan/hapus | TC-18, TC-22, TC-23 lulus | 5, 6 | Hari 3 |
| 8 | Pengujian dan perbaikan | Hasil TC; evaluasi cepat TC-28 bila data ada; uji usability singkat | M-01, M-02, M-08 tercatat | 4–7 | Hari 3 |
| 9 | Finalisasi dan pengumpulan | Deploy produksi, banner dan fixture cadangan, video demo, README, deskripsi pengumpulan | Demo berhasil pada kondisi layanan normal dan gagal; materi terkumpul sebelum tenggat | 8 | Hari 3 akhir |

**Aturan potong:** bila tahap 6 belum selesai akhir Hari 2, tahap 7 dibatalkan dan fokus pada kualitas demo inti.

---

# Lampiran

## A. Readiness Checklist

**Sudah jelas:**
- [x] Dua fokus, In/Out of Scope, dua aktor.
- [x] FR, US, NFR, dan matriks keterlacakan beserta ID.
- [x] Definisi konsep dan batas klaim.
- [x] Algoritma ALG-01..04 beserta contoh numerik.
- [x] Model data (dua tabel + RLS), privasi, aturan konsistensi UI.
- [x] Perilaku saat data tidak tersedia, kedaluwarsa, atau cakupan terbatas.

**Perlu keputusan sebelum membangun:**
- [ ] OQ-01: aturan dan format pengumpulan hackathon (termasuk jam tenggat).
- [ ] OQ-02: kota pilot.
- [ ] OQ-03: kuota/atribusi API dari dokumentasi resmi.
- [ ] OQ-04: OSRM atau ORS.
- [ ] OQ-05: versi tabel breakpoint AQI.
- [ ] OQ-06: sumber teks rekomendasi kesehatan.
- [ ] OQ-07: perlu fallback model atau tidak.

## B. Handoff Implementasi (ringkas)

1. **Struktur proyek (Next.js):** `app/` halaman (beranda, peta udara, perencanaan rute, login, riwayat, detail, pengaturan, metodologi); `app/api/` route handler (stations, geocode, routes/analyze, trips, preferences, account); `lib/` (airQualityService, aqiConversion, geocodingService, routingService, interpolation, exposure, routeScoring, recommendation, cache, config PAR); `components/` (peta, tabel perbandingan, panel detail, panel rekomendasi); `tests/` (unit, integrasi, fixtures); `supabase/` (skema SQL dan kebijakan RLS).
2. **Skema database:** Bagian 11 (`profiles`, `trips`) + kebijakan RLS.
3. **REST API contract:** envelope `{success, data, error, meta}`; respons `POST /api/routes/analyze` memuat daftar rute (label, jarak, durasi, geometri, estimasi, keyakinan, penanda terdominasi), `recommendedRouteLabel`, `explanation`, `actions[]`, `dataSources[]`, `warnings[]`, label tipe data.
4. **Environment:** `WAQI_TOKEN`, `ROUTING_BASE_URL`, `ORS_API_KEY` (bila dipakai), `GEOCODER_BASE_URL`, `GEOCODER_USER_AGENT`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only), `DATA_MODE` (`live`/`simulation`), `PILOT_CITY_BBOX`.
5. **Pemetaan halaman → komponen → endpoint:** Bagian 10.2.
6. **Testing checklist:** Bagian 16.
7. **Urutan implementasi:** Bagian 18.

## C. Keputusan Kritis (urut dampak arsitektur)

| No | Keputusan | Rekomendasi | Konsekuensi |
|---|---|---|---|
| 1 | Stack dan hosting | Next.js + Supabase + Vercel (DEC-01) | Cepat dan gratis; bergantung aturan hackathon (OQ-01) |
| 2 | Sumber data udara | WAQI + fallback Open-Meteo berlabel | Estimasi turunan AQI; fallback berupa data model |
| 3 | Metode spasial | IDW, tanpa klaim level jalan | Perbedaan rute dapat didominasi durasi; wajib ambang dan keyakinan |
| 4 | Definisi paparan | EI = Σ konsentrasi × durasi, bukan dosis | Klaim kesehatan dibatasi; disclaimer di semua hasil |
| 5 | Mekanisme optimasi | Skor berbobot + batas waktu + signifikansi + Pareto | Bobot awal asumsi |
| 6 | Mesin routing | OSRM demo atau ORS, tanpa kemacetan | Waktu bebas hambatan |
| 7 | Auth dan riwayat | Supabase Auth + RLS, prioritas Should | Alur inti tidak bergantung login |
| 8 | Cakupan geografis | Satu kota pilot | Di luar kota pilot estimasi tidak tersedia |
| 9 | Ketahanan demo | Mode simulasi berbanner + video demo cadangan | Menjaga penjurian; wajib menghindari kesan real-time |

## D. Rencana Materi Pengumpulan (asumsi, sesuaikan dengan OQ-08)

- Tautan aplikasi ter-deploy dan repositori publik dengan README (cara menjalankan, variabel lingkungan, atribusi data).
- Video demo 2–3 menit: masalah → analisis rute → perbandingan dan alasan → batasan estimasi → (bila ada) riwayat.
- Slide atau deskripsi singkat: problem, solusi, cara kerja estimasi (satu diagram alur), batasan data, roadmap (FR-17..FR-23).
- Narasi jujur: tekankan transparansi ketidakpastian sebagai pembeda, bukan klaim akurasi.
