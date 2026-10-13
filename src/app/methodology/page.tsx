import Link from 'next/link';

export default function MethodologyPage() {
  return (
    <div className="py-12 px-4 max-w-4xl mx-auto text-slate-200">
      <h1 className="text-3xl font-extrabold text-white mb-4">Metodologi & Batasan Sistem EcoPulse</h1>
      <p className="text-slate-400 mb-8 text-sm">
        Dokumentasi ilmiah ringkas mengenai formulasi perhitungan estimasi paparan, interpolasi spasial, serta batasan klaim kesehatan.
      </p>

      <div className="space-y-8">
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-emerald-400 mb-3">1. Definisi Konsep</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-slate-950/60 rounded border border-slate-800">
              <strong className="text-white block mb-1">Konsentrasi Polutan (µg/m³)</strong>
              Massa partikel PM2.5 per volume udara di titik tertentu pada saat observasi.
            </div>
            <div className="p-3 bg-slate-950/60 rounded border border-slate-800">
              <strong className="text-white block mb-1">Indikator Paparan (EI)</strong>
              Integral konsentrasi terhadap durasi: Σ (C_i · Δt_i) dalam satuan µg/m³·menit.
            </div>
            <div className="p-3 bg-slate-950/60 rounded border border-slate-800">
              <strong className="text-rose-400 block mb-1">Dosis Inhalasi (Tidak Diklaim)</strong>
              Massa partikel yang masuk ke paru-paru. Membutuhkan laju respirasi dan ventilasi kendaraan (di luar cakupan).
            </div>
            <div className="p-3 bg-slate-950/60 rounded border border-slate-800">
              <strong className="text-rose-400 block mb-1">Risiko Klinis (Tidak Diklaim)</strong>
              Dampak kesehatan spesifik individual. EcoPulse tidak mendiagnosis atau memprediksi penyakit.
            </div>
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-emerald-400 mb-3">2. Algoritma Interpolasi Spasial (IDW)</h2>
          <p className="text-sm text-slate-300 leading-relaxed mb-3">
            Sistem menggunakan metode <em>Inverse Distance Weighting (IDW)</em> dengan pangkat $p = 2$ untuk memperkirakan konsentrasi pada tiap segmen 500 meter rute berdasarkan 3 stasiun pengamat terdekat (radius maksimal 10 km).
          </p>
          <div className="p-3 bg-slate-950 rounded font-mono text-xs text-emerald-300">
            C = (Σ w_j * C_j) / (Σ w_j), di mana w_j = 1 / d_j^2
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-emerald-400 mb-3">3. Atribusi Sumber Data Eksternal</h2>
          <ul className="list-disc pl-5 text-sm space-y-2 text-slate-300">
            <li><strong>OpenStreetMap & Nominatim:</strong> Data peta dasar, geocoding alamat, dan jaringan jalan publik (ODbL License).</li>
            <li><strong>OSRM (Open Source Routing Machine):</strong> Perhitungan alternatif rute kendaraan bermotor.</li>
            <li><strong>WAQI (World Air Quality Index - aqicn.org):</strong> Data pemantauan stasiun kualitas udara kota pilot.</li>
            <li><strong>Open-Meteo Air Quality:</strong> Sumber data model numerik sebagai mekanisme fallback saat stasiun observasi offline.</li>
          </ul>
        </section>
      </div>

      <div className="mt-8 text-center">
        <Link href="/routes" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-semibold transition">
          Coba Analisis Rute Sekarang →
        </Link>
      </div>
    </div>
  );
}
