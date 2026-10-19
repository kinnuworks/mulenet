// Test wall (dark, logical 1600×860): 109 tiles flip grey → green in a wave from the top-left,
// then 12 mutant tiles flash red and each is struck out as "caught".
import React from 'react';
import {EASE, clamp01, sp} from '../../lib/motion';
import {Counter} from '../../components/Type';
import {ScreenProps} from '../types';
import {M, tb} from './shared';

type P = ScreenProps & {waveAt?: number; waveBeats?: number; mutAt?: number; caughtAt?: number};

const MUTANTS = [
  'double report',
  'membership root',
  'leaf binding',
  'consortium key',
  'regulator check',
  'threshold ≥ k',
  'unflag on retract',
  'retract ownership',
  'round in nullifier',
  'revoke history',
  'delist keeps flag',
  'threshold guard',
];

export const MnTests: React.FC<P> = ({f, b, fps, waveAt = 0.5, waveBeats = 3, mutAt = 6, caughtAt = 10}) => {
  const COLS = 16;
  const N = 109;
  const CELL = 48;
  const GAP = 8;
  return (
    <div style={{width: 1600, height: 860, position: 'relative', fontFamily: M.sans}}>
      <div style={{position: 'absolute', left: 0, top: 0}}>
        <div style={{fontFamily: M.mono, fontSize: 19, color: M.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 18}}>npm test · compact simulator</div>
        <div style={{display: 'grid', gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`, gap: GAP}}>
          {Array.from({length: N}, (_, i) => {
            const r = Math.floor(i / COLS);
            const c = i % COLS;
            const at = waveAt + ((r + c) / (COLS + 7)) * waveBeats;
            const flip = tb(f, b, at, at + 0.35, EASE.premium);
            return (
              <div key={i} style={{width: CELL, height: CELL, borderRadius: 10, background: flip > 0.5 ? 'rgba(61,220,151,0.85)' : 'rgba(255,255,255,0.08)', transform: `rotateY(${(1 - flip) * 180}deg) scale(${0.9 + 0.1 * flip})`, display: 'grid', placeItems: 'center'}}>
                {flip > 0.5 ? (
                  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#06331F" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                ) : null}
              </div>
            );
          })}
        </div>
        <div style={{marginTop: 26, display: 'flex', alignItems: 'baseline', gap: 18}}>
          <span style={{fontFamily: M.mono, fontSize: 88, fontWeight: 600, color: M.green, lineHeight: 1}}>
            <Counter f={f} from={0} to={N} f0={b(waveAt)} f1={b(waveAt + waveBeats + 0.4)} />
          </span>
          <span style={{fontSize: 34, fontWeight: 650, color: M.ink}}>tests passing</span>
        </div>
      </div>
      <div style={{position: 'absolute', left: 990, top: 0, width: 610}}>
        <div style={{fontFamily: M.mono, fontSize: 19, color: M.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 18, opacity: tb(f, b, mutAt - 0.5, mutAt)}}>npm run mutation</div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10}}>
          {MUTANTS.map((m, i) => {
            const at = mutAt + i * 0.12;
            const v = tb(f, b, at, at + 0.4);
            const ct = caughtAt + i * 0.22;
            const caught = f >= b(ct);
            const k = clamp01(sp(f, b(ct), fps, 0.55, 2.6));
            return (
              <div key={m} style={{height: 54, borderRadius: 12, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 10, opacity: v, background: caught ? 'rgba(61,220,151,0.10)' : 'rgba(255,90,71,0.12)', border: `1.5px solid ${caught ? 'rgba(61,220,151,0.5)' : 'rgba(255,90,71,0.55)'}`, fontFamily: M.mono, fontSize: 18, color: caught ? M.muted : '#FFB4AA', textDecoration: caught ? 'line-through' : undefined, transform: `scale(${caught ? 0.96 + 0.04 * k : 1})`}}>
                <span style={{color: caught ? M.green : M.red, fontWeight: 700, textDecoration: 'none'}}>{caught ? '✓' : '✕'}</span>
                {m}
              </div>
            );
          })}
        </div>
        <div style={{marginTop: 26, display: 'flex', alignItems: 'baseline', gap: 16, opacity: tb(f, b, caughtAt + 1.5, caughtAt + 2)}}>
          <span style={{fontFamily: M.mono, fontSize: 88, fontWeight: 600, color: M.amber, lineHeight: 1}}>12/12</span>
          <span style={{fontSize: 30, fontWeight: 650, color: M.ink}}>mutants caught</span>
        </div>
      </div>
    </div>
  );
};
