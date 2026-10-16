/**
 * @file IsoCity.tsx
 * @description Ilustrasi kota isometrik 3D (CSS 3D + SVG) untuk hero landing AANG.
 * Rotasi kamera dikendalikan oleh CSS variable --rx / --rz dari parent.
 * @module components/landing/IsoCity
 */

import React from 'react';

export type RouteFocus = 'clean' | 'fast' | null;

type Pt = [number, number];

const STEP_X = 200;
const STEP_Y = 180;
const GAP = 16;
const BW = STEP_X - GAP * 2;
const BH = STEP_Y - GAP * 2;

const CLEAN_PTS: Pt[] = [[200, 900], [800, 900], [800, 720], [1200, 720], [1200, 180]];
const FAST_PTS: Pt[] = [[200, 900], [200, 360], [1000, 360], [1000, 180], [1200, 180]];

/** Membuat path SVG dengan sudut membulat agar pergerakan mobil halus */
function roundedPath(pts: Pt[], r = 46): string {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[i + 1];
    const l1 = Math.hypot(cx - px, cy - py);
    const l2 = Math.hypot(nx - cx, ny - cy);
    const ax = cx - ((cx - px) / l1) * r;
    const ay = cy - ((cy - py) / l1) * r;
    const bx = cx + ((nx - cx) / l2) * r;
    const by = cy + ((ny - cy) / l2) * r;
    d += ` L${ax} ${ay} Q${cx} ${cy} ${bx} ${by}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${last[0]} ${last[1]}`;
}

export const CLEAN_PATH = roundedPath(CLEAN_PTS);
export const FAST_PATH = roundedPath(FAST_PTS);

/** PRNG deterministik agar render server & client identik */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PARKS = new Set(['2,4', '4,3', '5,3', '6,2', '5,1', '-1,3', '7,0', '0,5', '-2,1']);
const WATER = new Set(['6,4', '6,5', '7,4', '7,5', '8,4', '8,5']);
const DENSE = new Set(['1,1', '2,1', '3,1', '1,2', '2,2', '3,2', '4,1', '4,2', '0,1', '0,2']);

type Block = { i: number; j: number; x: number; y: number; type: 'park' | 'water' | 'city' };
type Building = { x: number; y: number; w: number; d: number; h: number; dense: boolean };
type Tree = { x: number; y: number; s: number };

const blocks: Block[] = [];
const buildings: Building[] = [];
const trees: Tree[] = [];

(() => {
  const rand = seeded(42);
  for (let i = -2; i <= 8; i++) {
    for (let j = -2; j <= 7; j++) {
      const key = `${i},${j}`;
      const x = i * STEP_X + GAP;
      const y = j * STEP_Y + GAP;
      const type = WATER.has(key) ? 'water' : PARKS.has(key) ? 'park' : 'city';
      blocks.push({ i, j, x, y, type });

      const inCore = i >= 0 && i <= 6 && j >= 0 && j <= 5;
      if (!inCore) continue;

      if (type === 'park') {
        const n = 4 + Math.floor(rand() * 3);
        for (let k = 0; k < n; k++) {
          trees.push({ x: x + 22 + rand() * (BW - 44), y: y + 26 + rand() * (BH - 40), s: 0.8 + rand() * 0.5 });
        }
        continue;
      }
      if (type !== 'city') continue;

      const dense = DENSE.has(key);
      const n = dense ? 2 + Math.floor(rand() * 2) : 1 + Math.floor(rand() * 2);
      const lotW = (BW - 12 * (n + 1)) / n;
      for (let k = 0; k < n; k++) {
        const d = BH - 28 - rand() * 46;
        buildings.push({
          x: x + 12 + k * (lotW + 12),
          y: y + 12 + rand() * (BH - 24 - d),
          w: lotW,
          d,
          h: dense ? 55 + rand() * 60 : 18 + rand() * 34,
          dense,
        });
      }
    }
  }
})();

const HAZES: { x: number; y: number; r: number; id: string }[] = [
  { x: 480, y: 330, r: 190, id: 'hazeOrange' },
  { x: 780, y: 300, r: 140, id: 'hazeRed' },
  { x: 250, y: 540, r: 150, id: 'hazeAmber' },
];

const BADGES: { x: number; y: number; aqi: number; color: string }[] = [
  { x: 560, y: 360, aqi: 156, color: '#ef4444' },
  { x: 200, y: 560, aqi: 128, color: '#f97316' },
  { x: 1000, y: 720, aqi: 38, color: '#10b981' },
  { x: 520, y: 900, aqi: 45, color: '#10b981' },
];

type BoxProps = {
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  z?: number;
  top: string;
  south: string;
  east: string;
  allSides?: boolean;
  radius?: number;
};

function Box({ x, y, w, d, h, z = 0, top, south, east, allSides, radius = 2 }: BoxProps) {
  return (
    <div
      className="iso-box"
      style={{ left: x, top: y, width: w, height: d, transform: z ? `translateZ(${z}px)` : undefined }}
    >
      {allSides && (
        <>
          <div className="iso-face" style={{ left: 0, top: 0, width: w, height: h, background: south, transform: 'rotateX(90deg)' }} />
          <div className="iso-face" style={{ left: 0, top: 0, width: h, height: d, background: east, transform: 'rotateY(-90deg)' }} />
        </>
      )}
      <div className="iso-face" style={{ left: 0, top: d, width: w, height: h, background: south, transform: 'rotateX(90deg)' }} />
      <div className="iso-face" style={{ left: w, top: 0, width: h, height: d, background: east, transform: 'rotateY(-90deg)' }} />
      <div
        className="iso-face"
        style={{ left: 0, top: 0, width: w, height: d, background: top, borderRadius: radius, transform: `translateZ(${h}px)` }}
      />
    </div>
  );
}

function Billboard({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  return (
    <div className="iso-bb" style={{ left: x, top: y }}>
      <div className="iso-bb-inner">{children}</div>
    </div>
  );
}

function Car({ path, variant, duration, delay = 0 }: { path: string; variant: 'clean' | 'fast'; duration: number; delay?: number }) {
  const clean = variant === 'clean';
  return (
    <div
      className="iso-car"
      style={{
        offsetPath: `path('${path}')`,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
      }}
    >
      <div className="iso-car-shadow" />
      <Box
        x={-24} y={-12} w={48} d={24} h={13} z={3} allSides radius={7}
        top={clean ? '#ffffff' : '#e2e8f0'}
        south={clean ? '#d1fae5' : '#cbd5e1'}
        east={clean ? '#a7f3d0' : '#94a3b8'}
      />
      <Box
        x={-12} y={-10} w={24} d={20} h={9} z={16} allSides radius={5}
        top={clean ? '#ecfdf5' : '#f1f5f9'}
        south="#334155"
        east="#1e293b"
      />
    </div>
  );
}

const SIDE_TEXTURE = 'repeating-linear-gradient(90deg, transparent 0 9px, rgba(15,23,42,.07) 9px 13px)';

export default function IsoCity({ focus }: { focus: RouteFocus }) {
  const cleanDim = focus === 'fast';
  const fastDim = focus === 'clean';

  return (
    <div className="iso-plane" aria-hidden="true">
      {/* Ground: blok kota, taman, air, kabut polusi, rute */}
      <svg className="iso-ground" viewBox="-400 -300 2200 1600" width={2200} height={1600}>
        <defs>
          <radialGradient id="hazeOrange">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hazeRed">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hazeAmber">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.36" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cleanZone">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </radialGradient>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        <rect x={-400} y={-300} width={2200} height={1600} fill="#fbfcfd" />

        {blocks.map((b) => (
          <rect
            key={`${b.i},${b.j}`}
            x={b.x}
            y={b.y}
            width={BW}
            height={BH}
            rx={b.type === 'water' ? 4 : 14}
            fill={b.type === 'water' ? '#cfe7f6' : b.type === 'park' ? '#dcf3d0' : '#eceff3'}
          />
        ))}

        {/* Bayangan bangunan & pohon */}
        <g filter="url(#softShadow)" fill="rgba(15,23,42,0.10)">
          {buildings.map((b, idx) => (
            <rect key={idx} x={b.x - b.h * 0.32} y={b.y + b.h * 0.1} width={b.w} height={b.d} rx={6} />
          ))}
          {trees.map((t, idx) => (
            <ellipse key={idx} cx={t.x - 6} cy={t.y + 3} rx={12 * t.s} ry={6 * t.s} />
          ))}
        </g>

        <circle cx={1000} cy={800} r={260} fill="url(#cleanZone)" />
        {HAZES.map((h) => (
          <circle key={h.id} className="iso-haze" cx={h.x} cy={h.y} r={h.r} fill={`url(#${h.id})`} />
        ))}

        {/* Rute tercepat (melewati zona polusi) */}
        <g className={`iso-route ${fastDim ? 'is-dim' : ''} ${focus === 'fast' ? 'is-focus' : ''}`}>
          <path d={FAST_PATH} fill="none" stroke="#fdba74" strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" opacity={0.35} />
          <path d={FAST_PATH} fill="none" stroke="#94a3b8" strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" />
          <path d={FAST_PATH} className="route-flow" fill="none" stroke="#f97316" strokeWidth={5} strokeLinecap="round" />
        </g>

        {/* Rute udara bersih */}
        <g className={`iso-route ${cleanDim ? 'is-dim' : ''} ${focus === 'clean' ? 'is-focus' : ''}`}>
          <path d={CLEAN_PATH} fill="none" stroke="#10b981" strokeWidth={34} strokeLinecap="round" strokeLinejoin="round" opacity={0.22} />
          <path d={CLEAN_PATH} fill="none" stroke="#0f172a" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
          <path d={CLEAN_PATH} className="route-flow" fill="none" stroke="#ffffff" strokeWidth={4} strokeLinecap="round" />
        </g>

        {/* Ring stasiun pemantau */}
        {BADGES.map((b) => (
          <g key={`${b.x}-${b.y}`}>
            <circle cx={b.x} cy={b.y} r={14} fill={b.color} opacity={0.25} className="iso-ring" />
            <circle cx={b.x} cy={b.y} r={7} fill={b.color} stroke="#fff" strokeWidth={3} />
          </g>
        ))}
      </svg>

      {/* Bangunan 3D */}
      {buildings.map((b, idx) => (
        <Box
          key={idx}
          x={b.x}
          y={b.y}
          w={b.w}
          d={b.d}
          h={b.h}
          top={b.dense ? '#f8fafc' : '#ffffff'}
          south={b.dense ? `${SIDE_TEXTURE}, #dde3ea` : '#e5e9ee'}
          east={b.dense ? `${SIDE_TEXTURE}, #c9d1db` : '#d3d9e0'}
        />
      ))}

      {/* Mobil bergerak di kedua rute */}
      <Car path={CLEAN_PATH} variant="clean" duration={11} />
      <Car path={FAST_PATH} variant="fast" duration={9} delay={-4} />

      {/* Pohon (billboard) */}
      {trees.map((t, idx) => (
        <Billboard key={idx} x={t.x} y={t.y}>
          <div className="iso-tree" style={{ width: 22 * t.s, height: 40 * t.s }}>
            <span className="iso-tree-crown" />
            <span className="iso-tree-trunk" />
          </div>
        </Billboard>
      ))}

      {/* Badge AQI stasiun */}
      {BADGES.map((b) => (
        <Billboard key={`badge-${b.x}-${b.y}`} x={b.x} y={b.y}>
          <div className="iso-badge-wrap">
            <span className="iso-badge" style={{ backgroundColor: b.color }}>
              <span className="opacity-80">AQI</span> {b.aqi}
            </span>
            <span className="iso-stem" style={{ backgroundColor: b.color }} />
          </div>
        </Billboard>
      ))}

      {/* Pin asal & tujuan */}
      <Billboard x={200} y={900}>
        <div className="iso-pin">
          <span className="iso-pin-label">Asal</span>
          <svg width="34" height="44" viewBox="0 0 36 46">
            <path d="M18 0C8 0 0 8 0 18c0 13 18 28 18 28s18-15 18-28C36 8 28 0 18 0z" fill="#10b981" />
            <circle cx="18" cy="18" r="7" fill="#fff" />
          </svg>
        </div>
      </Billboard>
      <Billboard x={1200} y={180}>
        <div className="iso-pin">
          <span className="iso-pin-label is-dark">Tujuan</span>
          <svg width="40" height="52" viewBox="0 0 36 46">
            <path d="M18 0C8 0 0 8 0 18c0 13 18 28 18 28s18-15 18-28C36 8 28 0 18 0z" fill="#0f172a" />
            <circle cx="18" cy="18" r="7" fill="#fff" />
          </svg>
        </div>
      </Billboard>
    </div>
  );
}
