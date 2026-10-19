// What the proof says (dark, logical 1600×820). Left: the licensed-bank Merkle tree. A path climbs
// from a hidden leaf to the root and the root check passes. Right: three statements tick in, and
// the raw account number scrambles into the opaque tag that goes on chain.
import React from 'react';
import {EASE, ms, sp, clamp01, tween} from '../../lib/motion';
import {Check} from '../../components/UI';
import {ScreenProps} from '../types';
import {M, tb} from './shared';

type P = ScreenProps & {treeAt?: number; pathAt?: number; rootAt?: number; s1?: number; s2?: number; s3?: number; tagAt?: number};

const ACCOUNT = 'SBIN0001234:00011122233';
const TAG = '2da36419efb58611ba2a…b59e8757';
const HEX = '0123456789abcdef';

export const MnProof: React.FC<P> = ({f, b, fps, treeAt = 0, pathAt = 2, rootAt = 5, s1 = 6, s2 = 9, s3 = 12, tagAt = 13}) => {
  // tree geometry (left 760px)
  const leaves = [0, 1, 2, 3, 4].map((i) => [70 + i * 150, 640] as [number, number]);
  const lvl1: Array<[number, number]> = [[145, 460], [445, 460], [670, 460]];
  const lvl2: Array<[number, number]> = [[295, 290], [670, 290]];
  const root: [number, number] = [480, 130];
  const edges: Array<[[number, number], [number, number], boolean]> = [
    [leaves[0], lvl1[0], false],
    [leaves[1], lvl1[0], false],
    [leaves[2], lvl1[1], true],
    [leaves[3], lvl1[1], false],
    [leaves[4], lvl1[2], false],
    [lvl1[0], lvl2[0], false],
    [lvl1[1], lvl2[0], true],
    [lvl1[2], lvl2[1], false],
    [lvl2[0], root, true],
    [lvl2[1], root, false],
  ];
  const tIn = tb(f, b, treeAt, treeAt + 1.2);
  const pathP = tb(f, b, pathAt, pathAt + 2.4, EASE.move);
  const rootOk = f >= b(rootAt);
  const rootPop = clamp01(sp(f, b(rootAt), fps, 0.6, 2.6));

  // account → tag scramble
  const tg = tb(f, b, tagAt, tagAt + 1.4, EASE.sine);
  const scramble = (src: string, dst: string, t: number) =>
    dst
      .split('')
      .map((ch, i) => (i / dst.length < t ? ch : t > 0 ? HEX[(i * 7 + f) % 16] : src[i] ?? ''))
      .join('');
  const shown = tg <= 0 ? ACCOUNT : scramble(ACCOUNT, TAG, tg);

  const stmt = (at: number, ok: boolean, text: string, sub: string) => {
    const p = tb(f, b, at, at + 0.6);
    return (
      <div style={{display: 'flex', alignItems: 'center', gap: 20, opacity: p, transform: `translateX(${(1 - p) * 30}px)`}}>
        {ok ? (
          <Check f={f} at={b(at) + 2} size={48} bg="#1FA463" />
        ) : (
          <div style={{width: 48, height: 48, borderRadius: 24, background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.25)', display: 'grid', placeItems: 'center'}}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={M.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3" /></svg>
          </div>
        )}
        <div>
          <div style={{fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em', color: M.ink}}>{text}</div>
          <div style={{fontFamily: M.mono, fontSize: 20, color: M.muted, marginTop: 4}}>{sub}</div>
        </div>
      </div>
    );
  };

  return (
    <div style={{width: 1600, height: 820, background: '#0E1014', fontFamily: M.sans, position: 'relative', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 40, top: 30, fontFamily: M.mono, fontSize: 18, letterSpacing: '0.1em', color: M.muted, textTransform: 'uppercase'}}>reportMule · zero-knowledge proof</div>
      <svg width={800} height={820} style={{position: 'absolute', left: 30, top: 60, opacity: tIn}}>
        {edges.map(([a, c, onPath], i) => {
          const lit = onPath ? pathP : 0;
          return (
            <g key={i}>
              <line x1={a[0]} y1={a[1]} x2={c[0]} y2={c[1]} stroke="rgba(255,255,255,0.16)" strokeWidth={3} />
              {lit > 0 ? <line x1={a[0]} y1={a[1]} x2={a[0] + (c[0] - a[0]) * clamp01(lit * 3 - (i === 2 ? 0 : i === 6 ? 1 : 2))} y2={a[1] + (c[1] - a[1]) * clamp01(lit * 3 - (i === 2 ? 0 : i === 6 ? 1 : 2))} stroke={M.amber} strokeWidth={6} strokeLinecap="round" /> : null}
            </g>
          );
        })}
        {[...lvl1, ...lvl2].map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={16} fill="#1A1D23" stroke="rgba(255,255,255,0.3)" strokeWidth={2} />
        ))}
        <circle cx={root[0]} cy={root[1]} r={30 + 6 * rootPop} fill={rootOk ? 'rgba(61,220,151,0.18)' : '#1A1D23'} stroke={rootOk ? M.green : 'rgba(255,255,255,0.4)'} strokeWidth={3} />
      </svg>
      {/* leaves: bank chips, the proving bank is never shown */}
      {leaves.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: 30 + p[0],
            top: 60 + p[1],
            transform: 'translate(-50%, -50%)',
            width: 120,
            height: 56,
            borderRadius: 14,
            background: i === 2 ? 'rgba(247,160,40,0.14)' : 'rgba(255,255,255,0.05)',
            border: `1.5px solid ${i === 2 && pathP > 0 ? M.amber : 'rgba(255,255,255,0.16)'}`,
            display: 'grid',
            placeItems: 'center',
            fontSize: 22,
            fontWeight: 650,
            color: M.ink,
            opacity: tIn,
            filter: 'blur(0px)',
          }}
        >
          {i === 2 && pathP > 0 ? '?' : `bank ${i + 1}`}
        </div>
      ))}
      <div style={{position: 'absolute', left: 30 + root[0] + 50, top: 60 + root[1] - 16, fontFamily: M.mono, fontSize: 22, color: rootOk ? M.green : M.muted, opacity: tIn}}>
        {rootOk ? 'root ✓ licensed' : 'licensed banks root'}
      </div>
      <div style={{position: 'absolute', left: 60, bottom: 30, fontFamily: M.mono, fontSize: 20, color: M.muted, opacity: tb(f, b, pathAt + 1, pathAt + 1.6)}}>
        path proven · leaf never revealed
      </div>
      {/* statements */}
      <div style={{position: 'absolute', left: 860, top: 120, display: 'flex', flexDirection: 'column', gap: 44}}>
        {stmt(s1, true, 'A licensed bank reported this', 'Merkle membership proof')}
        {stmt(s2, false, 'Which bank? Hidden.', 'no leaf, no name on chain')}
        {stmt(s3, false, 'Which account? Hidden.', 'only a keyed tag is public')}
      </div>
      <div style={{position: 'absolute', left: 860, top: 640, right: 40, opacity: tb(f, b, s3 + 0.4, s3 + 1)}}>
        <div style={{fontFamily: M.mono, fontSize: 16, color: M.muted, letterSpacing: '0.1em', textTransform: 'uppercase'}}>{tg >= 1 ? 'on chain' : 'private input'}</div>
        <div style={{marginTop: 10, fontFamily: M.mono, fontSize: 32, color: tg >= 1 ? M.amber : M.ink, whiteSpace: 'nowrap'}}>{shown}</div>
      </div>
      <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity: clamp01(tween(f, b(rootAt), b(rootAt) + ms(fps, 300), 0.25, 0))}} />
    </div>
  );
};
