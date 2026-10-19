// Threshold k = 3 (dark, logical 1600×820). Anonymous reports fly into three slots on the
// account tag; the third flips it to FLAGGED. Then two attacks bounce off with rejection stamps.
import React from 'react';
import {EASE, sp, clamp01} from '../../lib/motion';
import {ScreenProps} from '../types';
import {M, tb, lerp} from './shared';

type P = ScreenProps & {r1?: number; r2?: number; r3?: number; dup?: number; dupRej?: number; rogue?: number; rogueRej?: number};

export const MnThreshold: React.FC<P> = ({f, b, fps, r1 = 2, r2 = 5, r3 = 8.5, dup = 13, dupRej = 15.5, rogue = 19.5, rogueRej = 22}) => {
  const reports = [r1, r2, r3];
  const filled = reports.filter((r) => f >= b(r + 1)).length;
  const flagged = filled >= 3;
  const flagPop = clamp01(sp(f, b(r3 + 1), fps, 0.55, 2.4));
  const card = {x: 800, y: 330};
  const slotX = (i: number) => card.x - 150 + i * 150;

  // a token flying from the left edge into slot i, landing at beat at+1
  const token = (at: number, i: number, label: string, key: string) => {
    const t = tb(f, b, at, at + 1, EASE.move);
    if (t <= 0) return null;
    const x = lerp(-80, slotX(i), t);
    const y = lerp(720, card.y + 120, t) - Math.sin(t * Math.PI) * 160;
    return (
      <div key={key} style={{position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', width: 92, height: 92, borderRadius: 46, background: t >= 1 ? M.amber : 'rgba(247,160,40,0.22)', border: `3px solid ${M.amber}`, display: 'grid', placeItems: 'center', fontSize: 40, fontWeight: 800, color: t >= 1 ? '#2A1700' : M.ink, boxShadow: '0 0 40px rgba(247,160,40,0.35)'}}>
        {label}
      </div>
    );
  };

  // an attack: flies in, hits the wall, bounces back, stamp appears
  const attack = (at: number, rej: number, label: string, stamp: string, sub: string, y: number, key: string) => {
    const tIn = tb(f, b, at, at + 1.1, EASE.move);
    if (tIn <= 0) return null;
    const back = tb(f, b, rej - 0.4, rej + 0.6, EASE.premium);
    const x = lerp(-100, 560, tIn) - back * 200;
    const shake = f >= b(rej - 0.4) && f < b(rej) ? Math.sin(f * 2.2) * 8 : 0;
    const st = clamp01(sp(f, b(rej), fps, 0.5, 2.6));
    return (
      <React.Fragment key={key}>
        <div style={{position: 'absolute', left: x + shake, top: y, transform: 'translate(-50%, -50%)', padding: '16px 24px', borderRadius: 18, background: 'rgba(255,255,255,0.06)', border: `2px solid ${back > 0 ? M.red : 'rgba(255,255,255,0.3)'}`, fontSize: 28, fontWeight: 700, color: M.ink, whiteSpace: 'nowrap'}}>
          {label}
        </div>
        {f >= b(rej) ? (
          <div style={{position: 'absolute', left: 800, top: y, transform: `translate(0, -50%) rotate(-4deg) scale(${1.6 - 0.6 * st})`, opacity: clamp01(st * 2), padding: '12px 22px', border: `4px solid ${M.red}`, borderRadius: 14, color: M.red, fontWeight: 850, fontSize: 40, letterSpacing: '0.06em', whiteSpace: 'nowrap', background: 'rgba(7,8,10,0.85)'}}>
            {stamp}
            <div style={{fontFamily: M.mono, fontSize: 19, letterSpacing: 0, fontWeight: 500, marginTop: 2}}>{sub}</div>
          </div>
        ) : null}
      </React.Fragment>
    );
  };

  const cardY = 0;
  const pulse = flagged ? 1 + 0.05 * Math.max(0, Math.sin(clamp01((f - b(r3 + 1)) / (fps * 0.4)) * Math.PI)) : 1;

  return (
    <div style={{width: 1600, height: 820, position: 'relative', fontFamily: M.sans, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: cardY, width: 1600, height: 820}}>
        {/* the account card */}
        <div style={{position: 'absolute', left: card.x - 330, top: card.y - 130, width: 660, height: 380, borderRadius: 32, background: '#0E1014', border: `2px solid ${flagged ? M.red : 'rgba(255,255,255,0.14)'}`, boxShadow: flagged ? `0 0 ${80 * flagPop}px rgba(255,90,71,0.35)` : '0 30px 90px rgba(0,0,0,0.6)', transform: `scale(${pulse})`}}>
          <div style={{position: 'absolute', left: 36, top: 28, fontFamily: M.mono, fontSize: 18, color: M.muted, letterSpacing: '0.1em', textTransform: 'uppercase'}}>account tag</div>
          <div style={{position: 'absolute', left: 36, top: 62, fontFamily: M.mono, fontSize: 34, color: M.ink}}>2da36419…b59e8757</div>
          <div style={{position: 'absolute', right: 36, top: 28, fontFamily: M.mono, fontSize: 44, fontWeight: 600, color: flagged ? M.red : M.amber}}>{filled}/3</div>
          {flagged ? (
            <div style={{position: 'absolute', left: 36, bottom: 30, padding: '10px 20px', borderRadius: 999, background: M.red, color: '#fff', fontWeight: 800, fontSize: 28, letterSpacing: '0.08em', transform: `scale(${0.6 + 0.4 * flagPop})`, transformOrigin: 'left center'}}>FLAGGED</div>
          ) : (
            <div style={{position: 'absolute', left: 36, bottom: 34, fontSize: 24, color: M.muted}}>{filled === 0 ? 'No reports' : 'Watching · below threshold'}</div>
          )}
        </div>
        {/* slots */}
        {[0, 1, 2].map((i) => (
          <div key={i} style={{position: 'absolute', left: slotX(i), top: card.y + 120, transform: 'translate(-50%, -50%)', width: 96, height: 96, borderRadius: 48, border: '3px dashed rgba(255,255,255,0.22)'}} />
        ))}
        {reports.map((r, i) => token(r, i, '?', `t${i}`))}
        <div style={{position: 'absolute', left: 1180, top: card.y + 60, width: 360, fontSize: 26, lineHeight: 1.35, color: M.muted, opacity: tb(f, b, r1 + 1, r1 + 1.6) * (1 - tb(f, b, dup - 0.6, dup))}}>
          Each <span style={{color: M.amber, fontWeight: 700}}>?</span> is a different licensed bank. Nobody, not even the regulator, sees which.
        </div>
      </div>
      {attack(dup, dupRej, 'Same bank, again', 'REJECTED', 'already reported this account', 690, 'dup')}
      {attack(rogue, rogueRej, 'Unlicensed “ShadowPay”', 'REJECTED', 'not a licensed bank', 800, 'rogue')}
    </div>
  );
};
