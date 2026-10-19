// The opening (screen-space overlay, 1920×1080): "₹48,000" fills the frame on frame 0, breathes,
// a light sweep crosses it, then it flies down into the phone's amount field as the phone
// materialises underneath (a magic move).
import React from 'react';
import {EASE, tween, clamp01} from '../../lib/motion';
import {ScreenProps} from '../types';
import {M, tb, lerp} from './shared';

type P = ScreenProps & {flyAt?: number; landAt?: number; toY?: number; toScale?: number; kicker?: string};

export const MnHook: React.FC<P> = ({f, b, flyAt = 3.0, landAt = 4.2, toY = 478, toScale = 0.205, kicker}) => {
  const fly = tb(f, b, flyAt, landAt, EASE.move);
  const breathe = tween(f, 0, b(flyAt), 1, 1.035, EASE.sine);
  const sc = lerp(breathe, toScale, fly);
  const y = lerp(500, toY, fly);
  const fade = 1 - tb(f, b, landAt, landAt + 0.4);
  const sweep = clamp01(tween(f, b(0.6), b(2.4), 0, 1, EASE.sine));
  const glow = 1 - fly;
  return (
    <div style={{width: 1920, height: 1080, position: 'relative', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 960, top: 560, width: 1400, height: 700, transform: 'translate(-50%, -50%)', background: `radial-gradient(50% 50% at 50% 50%, rgba(247,160,40,${0.16 * glow}) 0%, rgba(247,160,40,0) 70%)`}} />
      <div
        style={{
          position: 'absolute',
          left: 960,
          top: y,
          transform: `translate(-50%, -50%) scale(${sc})`,
          fontFamily: M.sans,
          fontSize: 300,
          fontWeight: 800,
          letterSpacing: '-0.055em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          opacity: fade,
          color: 'transparent',
          backgroundImage: `linear-gradient(100deg, ${M.amber} 0%, ${M.amber} ${sweep * 120 - 25}%, #FFE3B0 ${sweep * 120 - 12}%, ${M.amber} ${sweep * 120}%, ${M.amber} 100%)`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
        }}
      >
        ₹48,000
      </div>
      {kicker ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 250, textAlign: 'center', fontFamily: M.sans, fontSize: 46, fontWeight: 600, letterSpacing: '-0.02em', color: M.ink, opacity: 1 - tb(f, b, flyAt - 0.5, flyAt)}}>
          {kicker.split('|').map((part, i) => (
            <span key={i} style={{color: i === 1 ? M.amber : M.ink}}>{part}</span>
          ))}
        </div>
      ) : null}
      <div style={{position: 'absolute', left: 0, right: 0, top: 700, textAlign: 'center', fontFamily: M.mono, fontSize: 26, letterSpacing: '0.18em', textTransform: 'uppercase', color: M.muted, opacity: (1 - tb(f, b, flyAt - 0.6, flyAt)) * tb(f, b, 0.8, 1.6)}}>
        a fake KYC call · one UPI payment
      </div>
    </div>
  );
};
