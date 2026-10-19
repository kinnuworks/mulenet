// The chain strip (dark, logical 1600×420): blocks slide past; the payee check leaves no block.
import React from 'react';
import {EASE, clamp01, sp} from '../../lib/motion';
import {ScreenProps} from '../types';
import {M, tb} from './shared';

type P = ScreenProps & {inAt?: number; ghostAt?: number; zeroAt?: number};

export const MnChain: React.FC<P> = ({f, b, fps, inAt = 0, ghostAt = 2, zeroAt = 4}) => {
  const slide = ((f - b(inAt)) / fps) * 40; // px per second
  const blocks = Array.from({length: 9}, (_, i) => i);
  const ghost = tb(f, b, ghostAt, ghostAt + 0.8);
  const zero = clamp01(sp(f, b(zeroAt), fps, 0.6, 2.4));
  return (
    <div style={{width: 1600, height: 560, position: 'relative', fontFamily: M.sans, overflow: 'hidden', opacity: tb(f, b, inAt, inAt + 0.6)}}>
      <div style={{position: 'absolute', left: 40, top: 26, fontFamily: M.mono, fontSize: 18, color: M.muted, letterSpacing: '0.1em', textTransform: 'uppercase'}}>midnight · new blocks</div>
      {blocks.map((i) => {
        const x = 40 + i * 230 - (slide % 230);
        const isGhost = i === 4;
        if (isGhost)
          return (
            <div key={i} style={{position: 'absolute', left: x, top: 70, width: 200, height: 250, borderRadius: 20, border: `3px dashed ${ghost > 0 ? M.amber : 'rgba(255,255,255,0.12)'}`, display: 'grid', placeItems: 'center', textAlign: 'center', opacity: 0.4 + 0.6 * ghost}}>
              <div style={{fontSize: 30, color: M.amber, fontWeight: 750, lineHeight: 1.2}}>payee<br />check</div>
            </div>
          );
        return (
          <div key={i} style={{position: 'absolute', left: x, top: 70, width: 200, height: 250, borderRadius: 20, background: '#12151A', border: '1.5px solid rgba(255,255,255,0.12)', padding: 18, boxSizing: 'border-box'}}>
            <div style={{fontFamily: M.mono, fontSize: 24, color: M.muted}}>#{1187 + i}</div>
            {[0, 1, 2].map((r) => (
              <div key={r} style={{marginTop: 16, height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.12)', width: `${60 + ((i * 37 + r * 23) % 40)}%`}} />
            ))}
          </div>
        );
      })}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 24, display: 'flex', justifyContent: 'center', gap: 24, alignItems: 'baseline', opacity: zero, transform: `scale(${0.85 + 0.15 * zero})`}}>
        <span style={{fontFamily: M.mono, fontSize: 110, fontWeight: 600, color: M.amber}}>0</span>
        <span style={{fontSize: 44, fontWeight: 680, color: M.ink}}>transactions · no trace of who checked whom</span>
      </div>
    </div>
  );
};

void EASE;
