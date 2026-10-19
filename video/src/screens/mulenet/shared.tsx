// MuleNet film: shared tokens and helpers. Colours come from the MuleNet console (ui/src).
import React from 'react';
import {EASE, Ease, clamp01, tween} from '../../lib/motion';

export const M = {
  stage: '#07080A',
  ink: '#F3F1EC',
  muted: '#9CA0AA',
  line: 'rgba(255,255,255,0.10)',
  amber: '#F7A028',
  amberHi: '#FFC45A',
  red: '#FF5A47',
  green: '#3DDC97',
  // light console UI
  ui: '#FFFFFF',
  uiAlt: '#F5F5F7',
  uiInk: '#1D1D1F',
  uiInk3: '#6E6E73',
  uiLine: 'rgba(0,0,0,0.08)',
  bad: '#C2341F',
  badWash: '#FDECEA',
  ok: '#1F7A3D',
  okWash: '#E7F4EB',
  mono: 'Geist Mono',
  sans: 'Inter',
  serif: 'Instrument Serif',
};

/** 0→1 between two beats. */
export const tb = (f: number, b: (n: number) => number, b0: number, b1: number, ease: Ease = EASE.premium) =>
  clamp01(tween(f, b(b0), b(b1), 0, 1, ease));

export const lerp = (a: number, c: number, t: number) => a + (c - a) * t;

/** Point on a cubic bézier. */
export const bez = (p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number], t: number): [number, number] => {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
};

/** Partial cubic bézier as an SVG path (0..t). Approximated with a polyline, sharp at any zoom. */
export const bezPath = (p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number], t: number, steps = 40) => {
  if (t <= 0) return '';
  const pts: string[] = [];
  const n = Math.max(2, Math.round(steps * t));
  for (let i = 0; i <= n; i++) {
    const [x, y] = bez(p0, p1, p2, p3, (t * i) / n);
    pts.push(`${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join(' ');
};

/** The MuleNet mark: three linked nodes, the payee ringed in amber. */
export const MuleMark: React.FC<{size: number; draw?: number; ring?: number}> = ({size, draw = 1, ring = 1}) => (
  <svg width={size} height={size} viewBox="0 0 64 64">
    <rect width="64" height="64" rx="14" fill="#16181D" />
    <path d="M20 22L32 44M44 22L32 44M20 22H44" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity={0.55} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - draw} />
    <circle cx="20" cy="22" r={5 * Math.min(1, draw * 2)} fill="#fff" />
    <circle cx="44" cy="22" r={5 * Math.min(1, draw * 2)} fill="#fff" />
    <circle cx="32" cy="44" r={5 * Math.min(1, draw * 2)} fill="#fff" />
    <circle cx="32" cy="44" r="10" fill="none" stroke={M.amber} strokeWidth="2.5" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - ring} transform="rotate(-90 32 44)" />
  </svg>
);

export const MuleIcon: React.FC<Record<string, unknown>> = () => <MuleMark size={58} />;

/** "Demo data" tag for illustrative numbers. */
export const DemoTag: React.FC<{opacity?: number; style?: React.CSSProperties}> = ({opacity = 1, style}) => (
  <div style={{fontFamily: M.mono, fontSize: 18, letterSpacing: '0.08em', textTransform: 'uppercase', color: M.muted, opacity, ...style}}>Demo data · illustrative</div>
);
