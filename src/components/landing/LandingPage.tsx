/**
 * @file LandingPage.tsx
 * @description Landing page AANG bergaya parallax isometrik: kamera kota 3D bereaksi
 * terhadap gerakan mouse & scroll, kartu mengambang dengan kedalaman berbeda,
 * dan section yang muncul saat digulir.
 * @module components/landing/LandingPage
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import IsoCity, { type RouteFocus } from './IsoCity';
import {
  RouteIcon,
  LayersIcon,
  NavigationIcon,
  ClockIcon,
  LocationIcon,
  HistoryIcon,
} from '@/components/common/Icons';

const ROUTES = {
  clean: {
    label: 'Udara Bersih',
    duration: '34 menit',
    distance: '12,4 km',
    pm25: 18,
    note: '−27% paparan PM2.5 · +3 menit',
    color: '#10b981',
    segments: ['#10b981', '#10b981', '#f59e0b', '#10b981', '#10b981', '#10b981'],
  },
  fast: {
    label: 'Tercepat',
    duration: '31 menit',
    distance: '11,1 km',
    pm25: 25,
    note: 'Melewati 2 zona AQI > 150',
    color: '#f97316',
    segments: ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#ef4444', '#f59e0b'],
  },
} as const;

const STEPS = [
  {
    icon: <LocationIcon size={20} />,
    title: 'Tentukan asal & tujuan',
    body: 'Cari lokasi di mana pun di Indonesia. Analisis langsung berjalan tanpa perlu login.',
  },
  {
    icon: <LayersIcon size={20} />,
    title: 'Kami baca udara di sepanjang jalan',
    body: 'Data sensor WAQI dan model Open-Meteo diinterpolasi ke setiap ruas rute alternatif.',
  },
  {
    icon: <RouteIcon size={20} />,
    title: 'Pilih trade-off Anda sendiri',
    body: 'Bandingkan menit tambahan dengan reduksi paparan PM2.5 secara eksplisit dan jujur.',
  },
];

const FEATURES = [
  {
    icon: <ClockIcon size={20} />,
    tone: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    title: 'Trade-off yang nyata',
    body: 'Ketahui harga waktu tambahan (+3 menit) vs manfaat reduksi polusi (−16%) secara eksplisit, bukan skor abstrak.',
  },
  {
    icon: <LayersIcon size={20} />,
    tone: 'bg-sky-50 text-sky-600 ring-sky-100',
    title: 'Transparan & jujur batasan',
    body: 'Menampilkan tingkat keyakinan (High/Med/Low) dan usia data stasiun. Estimasi lingkungan, bukan dosis klinis.',
  },
  {
    icon: <HistoryIcon size={20} />,
    tone: 'bg-violet-50 text-violet-600 ring-violet-100',
    title: 'Privasi tanpa kompromi',
    body: 'Riwayat perjalanan hanya disimpan atas persetujuan sadar Anda, dilindungi Row Level Security.',
  },
];

const STATS = [
  { value: '38', label: 'Provinsi tercakup' },
  { value: '2', label: 'Sumber data udara' },
  { value: '6', label: 'Kategori AQI resmi' },
  { value: '0', label: 'Login untuk mulai' },
];

function clamp(v: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, v));
}

function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--tx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    el.style.setProperty('--ty', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
  };
  const onLeave = () => {
    ref.current?.style.setProperty('--tx', '0');
    ref.current?.style.setProperty('--ty', '0');
  };
  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className={`tilt-card ${className}`}>
      {children}
    </div>
  );
}

export default function LandingPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState<RouteFocus>('clean');
  const active = ROUTES[focus === 'fast' ? 'fast' : 'clean'];

  // Kamera parallax: mouse + scroll → CSS variables (tanpa re-render React)
  useEffect(() => {
    const scroller = scrollRef.current;
    const hero = heroRef.current;
    const stage = stageRef.current;
    if (!scroller || !hero || !stage) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const target = { mx: 0, my: 0, p: 0 };
    const cur = { mx: 0, my: 0, p: 0 };
    let base = 1;

    const onResize = () => {
      base = clamp(window.innerWidth / 1280, 0.55, 1.05);
    };
    const onMove = (e: PointerEvent) => {
      if (reduce) return;
      target.mx = (e.clientX / window.innerWidth) * 2 - 1;
      target.my = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onScroll = () => {
      const max = hero.offsetHeight - scroller.clientHeight;
      target.p = max > 0 ? clamp(scroller.scrollTop / max) : 0;
    };

    let raf = 0;
    const tick = () => {
      const k = reduce ? 1 : 0.075;
      cur.mx += (target.mx - cur.mx) * k;
      cur.my += (target.my - cur.my) * k;
      cur.p += (target.p - cur.p) * (reduce ? 1 : 0.12);

      const p = cur.p * cur.p * (3 - 2 * cur.p); // smoothstep
      const rx = 54 - p * 12 - cur.my * 4;
      const rz = 34 - p * 16 + cur.mx * 6;
      const s = base * (0.92 + p * 0.38);
      const ty = 260 - p * 300;

      stage.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
      stage.style.setProperty('--rz', `${rz.toFixed(2)}deg`);
      stage.style.setProperty('--s', s.toFixed(4));
      stage.style.setProperty('--ty', `${ty.toFixed(1)}px`);
      stage.style.setProperty('--mx', cur.mx.toFixed(4));
      stage.style.setProperty('--my', cur.my.toFixed(4));
      stage.style.setProperty('--p', p.toFixed(4));
      raf = requestAnimationFrame(tick);
    };

    onResize();
    onScroll();
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onMove, { passive: true });
    scroller.addEventListener('scroll', onScroll, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      scroller.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Reveal section saat masuk viewport
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('is-visible');
            io.unobserve(en.target);
          }
        });
      },
      { root: scroller, threshold: 0.18 }
    );
    scroller.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div ref={scrollRef} className="landing-scroll h-full w-full overflow-y-auto overflow-x-hidden bg-[#f4f6f8]">
      {/* ================= HERO PARALLAX ================= */}
      <section ref={heroRef} className="relative h-[230vh]" aria-labelledby="hero-title">
        <div ref={stageRef} className="landing-stage sticky top-0 h-screen w-full overflow-hidden">
          {/* Kota isometrik 3D */}
          <div className="iso-scene">
            <IsoCity focus={focus} />
          </div>

          {/* Fade atas agar teks terbaca */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[62%] bg-gradient-to-b from-[#f4f6f8] from-40% via-[#f4f6f8]/80 to-transparent" />

          {/* Headline */}
          <div className="hero-copy relative z-10 mx-auto max-w-4xl px-6 pt-28 text-center sm:pt-32">
            <span className="hero-in inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 shadow-sm backdrop-blur">
              <span className="live-dot" /> Kualitas udara langsung · Seluruh Indonesia
            </span>
            <h1
              id="hero-title"
              className="hero-in mt-5 text-4xl font-extrabold leading-[1.04] tracking-[-0.035em] text-slate-900 sm:text-6xl"
              style={{ animationDelay: '80ms' }}
            >
              Pergi ke mana saja,
              <br />
              <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 bg-clip-text text-transparent">
                hirup udara yang lebih bersih.
              </span>
            </h1>
            <p
              className="hero-in mx-auto mt-5 max-w-xl text-sm leading-relaxed text-slate-500 sm:text-base"
              style={{ animationDelay: '160ms' }}
            >
              Jangan hanya melihat rute tercepat. AANG membandingkan waktu tempuh dengan estimasi
              paparan PM2.5 di setiap rute, berbasis interpolasi stasiun udara.
            </p>
            <div className="hero-in mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ animationDelay: '240ms' }}>
              <Link
                id="hero-cta-routes"
                href="/routes"
                className="group inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-[0_10px_30px_-8px_rgba(15,23,42,0.6)] transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                <NavigationIcon size={16} />
                Mulai Analisis Rute
                <span className="transition group-hover:translate-x-0.5">→</span>
              </Link>
              <Link
                id="hero-cta-map"
                href="/map"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-6 py-3 text-sm font-bold text-slate-700 backdrop-blur transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white"
              >
                <LayersIcon size={16} />
                Lihat Peta Polusi
              </Link>
            </div>
          </div>

          {/* Kartu perbandingan rute (interaktif) */}
          <div className="par-card absolute bottom-[9%] right-[4%] z-20 hidden md:block" style={{ '--depth': 26, '--rise': 40 } as React.CSSProperties}>
            <div className="float-slow w-[300px] rounded-3xl border border-white/80 bg-white/90 p-4 shadow-[0_30px_60px_-20px_rgba(15,23,42,0.35)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Perbandingan Rute</span>
                <span className="text-[11px] font-semibold text-slate-400">Live</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                {(['clean', 'fast'] as const).map((key) => (
                  <button
                    key={key}
                    id={`hero-route-${key}`}
                    type="button"
                    onClick={() => setFocus(key)}
                    onMouseEnter={() => setFocus(key)}
                    className={`rounded-lg py-1.5 text-xs font-bold transition ${
                      (focus ?? 'clean') === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {key === 'clean' ? '🌿 ' : '⚡ '}
                    {ROUTES[key].label}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <div key={active.duration} className="text-2xl font-extrabold tracking-tight text-slate-900 animate-slide-down">
                    {active.duration}
                  </div>
                  <div className="text-xs text-slate-500">{active.distance}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Rata-rata PM2.5</div>
                  <div className="whitespace-nowrap text-lg font-extrabold" style={{ color: active.color }}>
                    {active.pm25} <span className="text-[11px] font-semibold text-slate-400">µg/m³</span>
                  </div>
                </div>
              </div>

              {/* Profil AQI sepanjang rute */}
              <div className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full">
                {active.segments.map((c, i) => (
                  <span key={i} className="flex-1 transition-colors duration-500" style={{ backgroundColor: c }} />
                ))}
              </div>

              <div className="mt-3 rounded-xl px-3 py-2 text-xs font-semibold" style={{ backgroundColor: `${active.color}14`, color: active.color }}>
                {active.note}
              </div>

              {/* Progress perjalanan */}
              <div className="mt-4">
                <div className="relative h-1 rounded-full bg-slate-200">
                  <span className="trip-dot absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white shadow" style={{ backgroundColor: active.color }} />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] font-medium text-slate-400">
                  <span>Asal</span>
                  <span>Dalam perjalanan</span>
                  <span>Tujuan</span>
                </div>
              </div>
            </div>
          </div>

          {/* Kartu stasiun (muncul saat scroll) */}
          <div className="par-card par-appear absolute left-[5%] top-[44%] z-20 hidden lg:block" style={{ '--depth': 40, '--rise': 90 } as React.CSSProperties}>
            <div className="float-med flex items-center gap-3 rounded-2xl border border-white/80 bg-white/90 p-3 pr-4 shadow-[0_20px_45px_-18px_rgba(15,23,42,0.35)] backdrop-blur-xl">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <LocationIcon size={18} />
              </span>
              <div>
                <div className="text-xs font-bold text-slate-800">Stasiun Simpang Lima</div>
                <div className="text-[10px] text-slate-400">WAQI · 12 menit lalu</div>
              </div>
              <span className="ml-2 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white">
                <span className="opacity-80">AQI</span> 45
              </span>
            </div>
          </div>

          {/* Kartu estimasi paparan (muncul saat scroll) */}
          <div className="par-card par-appear absolute bottom-[10%] left-[7%] z-20 hidden lg:block" style={{ '--depth': 18, '--rise': 120 } as React.CSSProperties}>
            <div className="float-fast w-[230px] rounded-2xl border border-white/80 bg-white/90 p-4 shadow-[0_20px_45px_-18px_rgba(15,23,42,0.35)] backdrop-blur-xl">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Estimasi Paparan</div>
              {(['clean', 'fast'] as const).map((key) => (
                <div key={key} className="mt-3">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-600">{ROUTES[key].label}</span>
                    <span className="font-bold text-slate-800">{ROUTES[key].pm25} µg/m³</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                    <span
                      className="exposure-bar block h-full rounded-full"
                      style={{ width: `${(ROUTES[key].pm25 / 30) * 100}%`, backgroundColor: ROUTES[key].color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Petunjuk scroll */}
          <div className="scroll-hint pointer-events-none absolute bottom-6 left-1/2 z-20 -translate-x-1/2 flex flex-col items-center gap-2 text-[11px] font-semibold text-slate-400">
            <span className="flex h-8 w-5 justify-center rounded-full border-2 border-slate-300 pt-1.5">
              <span className="scroll-wheel h-1.5 w-1 rounded-full bg-slate-400" />
            </span>
            Gulir untuk menjelajah
          </div>
        </div>
      </section>

      {/* ================= CARA KERJA ================= */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-24" aria-labelledby="how-title">
        <div className="reveal mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Cara kerja</span>
          <h2 id="how-title" className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Tiga langkah menuju perjalanan yang lebih sehat
          </h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="reveal" style={{ transitionDelay: `${i * 120}ms` }}>
              <TiltCard className="h-full rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">{s.icon}</span>
                  <span className="text-5xl font-extrabold tracking-tighter text-slate-100">0{i + 1}</span>
                </div>
                <h3 className="mt-6 text-lg font-bold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{s.body}</p>
              </TiltCard>
            </div>
          ))}
        </div>
      </section>

      {/* ================= STATISTIK ================= */}
      <section className="relative z-10 px-6" aria-label="Statistik AANG">
        <div className="reveal mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-slate-900 px-8 py-12 text-white shadow-2xl">
          <div className="stats-glow" />
          <div className="relative grid grid-cols-2 gap-8 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="bg-gradient-to-b from-white to-emerald-200 bg-clip-text text-5xl font-extrabold tracking-tighter text-transparent">
                  {s.value}
                </div>
                <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= KEUNGGULAN ================= */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-24" aria-labelledby="feature-title">
        <div className="reveal mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Kenapa AANG</span>
          <h2 id="feature-title" className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Dibangun di atas kejujuran data
          </h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="reveal" style={{ transitionDelay: `${i * 120}ms` }}>
              <TiltCard className="h-full rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-4 ${f.tone}`}>{f.icon}</span>
                <h3 className="mt-6 text-lg font-bold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.body}</p>
              </TiltCard>
            </div>
          ))}
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="relative z-10 px-6 pb-16" aria-labelledby="cta-title">
        <div className="reveal mx-auto max-w-4xl rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-8 py-14 text-center shadow-sm">
          <h2 id="cta-title" className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Rute berikutnya, pilih yang lebih sehat.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-slate-500">
            Gratis, tanpa login, dan langsung berjalan di seluruh Indonesia.
          </p>
          <Link
            id="footer-cta-routes"
            href="/routes"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-7 py-3 text-sm font-bold text-white shadow-[0_12px_30px_-10px_rgba(16,185,129,0.8)] transition hover:-translate-y-0.5 hover:bg-emerald-700"
          >
            <NavigationIcon size={16} />
            Rencanakan Rute Sekarang
          </Link>
        </div>
        <footer className="mx-auto mt-12 max-w-6xl border-t border-slate-200 pt-6 text-center text-[11px] text-slate-400">
          © 2026 AANG — Air-Aware Navigation Guidance. Angka paparan merupakan estimasi lingkungan, bukan dosis klinis.
        </footer>
      </section>
    </div>
  );
}
