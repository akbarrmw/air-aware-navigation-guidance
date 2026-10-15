import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import {
  LeafLogo,
  RouteIcon,
  LayersIcon,
  HistoryIcon,
} from '@/components/common/Icons';

export const metadata: Metadata = {
  title: 'EcoPulse — Air Quality Route Intelligence',
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="relative w-full h-screen overflow-hidden bg-slate-100 flex flex-col">
          {/* Google Maps Style Floating Topbar Header */}
          <header className="topbar">
            <Link href="/" className="brand">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <LeafLogo />
              </div>
              <div className="brand-copy">
                <span className="brand-name">EcoPulse</span>
                <span className="brand-mode">Air-Aware Navigation</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200" aria-label="Navigasi Utama">
              <Link href="/routes" className="nav-link">
                <RouteIcon size={16} />
                <span>Navigasi Rute</span>
              </Link>
              <Link href="/map" className="nav-link">
                <LayersIcon size={16} />
                <span>Peta Polusi</span>
              </Link>
              <Link href="/history" className="nav-link">
                <HistoryIcon size={16} />
                <span>Riwayat</span>
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <div className="live-badge hidden sm:flex">
                <span className="live-dot" />
                <span className="font-semibold text-slate-700">Semarang (Pilot)</span>
              </div>

              <Link
                href="/login"
                className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center hover:bg-slate-700 transition shadow-sm"
                aria-label="Profil Pengguna"
              >
                EP
              </Link>
            </div>
          </header>

          {/* Main Map Viewport */}
          <main className="w-full h-full relative z-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
