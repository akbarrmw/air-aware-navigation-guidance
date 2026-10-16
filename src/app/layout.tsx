import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { UserNav } from '@/components/common/UserNav';
import { Navbar } from '@/components/common/Navbar';

export const metadata: Metadata = {
  title: 'AANG — Air-Aware Navigation Guidance',
  description:
    'Platform navigasi cerdas yang membantu masyarakat perkotaan memperkirakan paparan polusi PM2.5 dan memilih rute perjalanan yang lebih sehat.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
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
            <Link href="/" className="brand group">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center p-0.5 shadow-sm border border-slate-200/80 group-hover:scale-105 transition overflow-hidden">
                <img
                  src="/logo.png"
                  alt="Logo AANG"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="brand-copy">
                <span className="brand-name">AANG</span>
                <span className="brand-mode">Air-Aware Navigation Guidance</span>
              </div>
            </Link>

            {/* Dynamic Active Navbar with Elevation Shadow */}
            <Navbar />

            <div className="flex items-center gap-3">
              <div className="live-badge hidden sm:flex">
                <span className="live-dot" />
                <span className="font-semibold text-slate-700">Indonesia Live</span>
              </div>

              <UserNav />
            </div>
          </header>

          {/* Main Map Viewport */}
          <main className="w-full h-full relative z-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
