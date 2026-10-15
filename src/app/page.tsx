import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="relative overflow-hidden py-16 sm:py-24">
      {/* Glow Effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6">
          <span>✨</span> AANG — Air-Aware Navigation Guidance
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-6">
          Pilih Rute Perjalanan, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
            Kenali Estimasi Paparan Polusi.
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-slate-300 text-base sm:text-lg mb-10 leading-relaxed">
          Jangan hanya melihat rute tercepat. Bandingkan trade-off waktu tempuh dan estimasi akumulasi
          paparan partikel PM2.5 secara transparan, berbasis data interpolasi stasiun udara.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/routes"
            className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-base transition shadow-lg shadow-emerald-500/20"
          >
            Mulai Analisis Rute 🚀
          </Link>
          <Link
            href="/map"
            className="w-full sm:w-auto px-8 py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold text-base border border-slate-700 transition"
          >
            Pantau Kualitas Udara Kota
          </Link>
        </div>

        {/* 3 Keunggulan Utama */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-xl mb-4">
              ⏱️
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Penjelasan Trade-Off Nyata</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Ketahui harga waktu tambahan (+3 menit) vs manfaat reduksi polusi (-16%) secara eksplisit, bukan skor abstrak.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center text-xl mb-4">
              📊
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Transparan & Jujur Batasan</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Menampilkan tingkat keyakinan (High/Med/Low) dan usia data stasiun. Kami menyatakan estimasi lingkungan, bukan dosis klinis.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center text-xl mb-4">
              🛡️
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Privasi Tanpa Kompromi</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Analisis rute langsung berjalan tanpa login. Data perjalanan hanya disimpan atas persetujuan sadar Anda dengan proteksi RLS.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
