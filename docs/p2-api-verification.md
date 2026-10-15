# Hasil Spike Verifikasi API Eksternal (Person 2)

Dokumen ini mencatat hasil pengujian nyata (Spike S1–S4) terhadap 4 penyedia API eksternal yang diintegrasikan oleh Person 2 sesuai dengan `CODE_SPEC_AANG.md` Bagian 7.2.

---

## 1. Spike S1: WAQI (World Air Quality Index - aqicn.org)
* **Kredensial**: Memerlukan API Token (`WAQI_TOKEN`), disimpan aman di `.env` (server-only).
* **Endpoint Bounding Box**:
  - URL: `https://api.waqi.info/v2/map/bounds?latlng={minLat},{minLng},{maxLat},{maxLng}&token={token}`
  - Format BBox: `latlng=minLat,minLng,maxLat,maxLng` (misal Semarang: `-7.08,110.32,-6.93,110.50`)
  - Hasil Pengujian Kota Semarang:
    - Status: `ok`
    - Ditemukan 1 stasiun aktif:
      ```json
      {
        "lat": -6.985,
        "lon": 110.381,
        "uid": 13651,
        "aqi": "153",
        "station": {
          "name": "Semarang, Indonesia",
          "time": "2026-10-15T22:00:00+09:00"
        }
      }
      ```
* **Endpoint Detail Stasiun (Feed)**:
  - URL: `https://api.waqi.info/feed/@{uid}/?token={token}`
  - Hasil Pengujian UID 13651:
    - `iaqi.pm25.v`: `153` (tersedia konsentrasi PM2.5 aktual)
    - Waktu observasi: ISO format `2026-10-15T20:00:00+07:00`
* **Temuan Kunci S1**:
  - Endpoint bbox memberikan gambaran umum stasiun dan nilai AQI. Nilai PM2.5 akurat tersedia di feed detail.
  - Di area Kota Semarang terdapat 1 stasiun primer resmi. Maka, integrasi fallback Open-Meteo (S4) sangat krusial untuk melengkapi resolusi spasial di sepanjang rute.

---

## 2. Spike S2: OSRM Routing
* **Kredensial**: **Tanpa API Key** (Menggunakan public server OSRM `https://router.project-osrm.org`).
* **Endpoint**:
  - URL: `https://router.project-osrm.org/route/v1/driving/{originLng},{originLat};{destLng},{destLat}?overview=full&geometries=geojson&alternatives=true`
* **Hasil Pengujian (Simpang Lima ke Undip Tembalang)**:
  - Jarak: 10.08 km (10,080 meter)
  - Durasi: 12.5 menit (750 detik)
  - Jumlah koordinat: 408 titik koordinat
* **Temuan Kunci S2**:
  - Format koordinat OSRM adalah `[longitude, latitude]`.
  - **Aturan Wajib**: Person 2 harus mengonversi koordinat menjadi `[latitude, longitude]` agar sesuai dengan Leaflet dan algoritma Person 1.

---

## 3. Spike S3: Nominatim (OpenStreetMap Geocoder)
* **Kredensial**: **Tanpa API Key**.
* **Ketentuan Penggunaan**: Wajib menyertakan header `User-Agent` yang jelas (`EcoPulse-Hackathon-App/1.0 (contact@ecopulse.local)`).
* **Endpoint**:
  - URL: `https://nominatim.openstreetmap.org/search?format=json&limit=5&q={query}`
* **Hasil Pengujian**:
  - Query: `"Simpang Lima Semarang"`
  - Menghasilkan titik: `lat: -6.9893202`, `lon: 110.4235821`.
  - Cache: Disimpan in-memory 24 jam per query.

---

## 4. Spike S4: Open-Meteo Air Quality (Fallback Model)
* **Kredensial**: **Tanpa API Key** (Akses publik bebas untuk penggunaan riset & non-komersial).
* **Endpoint**:
  - URL: `https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lng}&current=pm10,pm2_5,european_aqi,us_aqi&hourly=pm2_5`
* **Hasil Pengujian (Semarang: -6.99, 110.42)**:
  - `pm2_5`: `41.3` µg/m³
  - `pm10`: `44` µg/m³
  - `us_aqi`: `226`
* **Temuan Kunci S4**:
  - Sangat cepat, dapat diandalkan sebagai cadangan jika stasiun WAQI tidak mencakup rute tertentu atau jika stasiun observasi berstatus `stale` / `expired`.
