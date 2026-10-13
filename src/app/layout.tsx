import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'EcoPulse — Pilih Rute, Kenali Paparan',
  description:
    'Platform navigasi cerdas yang membantu masyarakat perkotaan memperkirakan paparan polusi PM2.5 dan memilih rute perjalanan yang lebih sehat.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
        <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-slate-950 text-lg">
                🌱
              </span>
              <span className="font-bold text-xl tracking-tight text-white">
                Eco<span className="text-emerald-400">Pulse</span>
              </span>
            </Link>

            <nav className="flex items-center gap-6 text-sm font-medium">
              <Link href="/routes" className="text-slate-300 hover:text-emerald-400 transition">
                Rencana Rute
              </Link>
              <Link href="/map" className="text-slate-300 hover:text-emerald-400 transition">
                Peta Udara
              </Link>
              <Link href="/methodology" className="text-slate-300 hover:text-emerald-400 transition">
                Metodologi
              </Link>
              <Link
                href="/history"
                className="text-slate-300 hover:text-emerald-400 transition hidden sm:inline"
              >
                Riwayat
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-semibold transition"
              >
                Masuk / Akun
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="bg-slate-900/80 border-t border-slate-800 py-6 text-xs text-slate-400 text-center">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© 2026 EcoPulse. Dibuat untuk demonstrasi Hackathon. Estimasi indikator paparan lingkungan.</p>
            <div className="flex gap-4">
              <Link href="/methodology" className="hover:text-emerald-400">
                Atribusi Sumber & Batasan
              </Link>
              <Link href="/settings" className="hover:text-emerald-400">
                Privasi & Pengaturan
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
