// UPI-style pay screen (phone, 393×852). mode 'pay': the scam payment goes through.
// mode 'check': MuleNet checks the payee first and blocks it.
import React from 'react';
import {EASE, ms, sp, tween, clamp01, keys} from '../../lib/motion';
import {Check, Tap} from '../../components/UI';
import {ScreenProps} from '../types';
import {M, tb} from './shared';

type P = ScreenProps & {mode?: 'pay' | 'check'; tapAt?: number; resultAt?: number; amountAt?: number};

export const MnPay: React.FC<P> = ({f, b, fps, mode = 'pay', tapAt = 5, resultAt = 6, amountAt = -99}) => {
  const tap = b(tapAt);
  const res = b(resultAt);
  const press = keys(f, [[tap - 3, 1], [tap, 0.95, EASE.premium], [tap + 8, 1, EASE.premium]]);
  const busy = mode === 'check' && f >= tap && f < res;
  const resP = clamp01(sp(f, res, fps, 0.82, 2.2));
  const spin = ((f - tap) / fps) * 360;
  const btnLabel = mode === 'pay' ? 'Pay ₹48,000' : busy ? 'Checking payee…' : 'Check payee & pay';
  return (
    <div style={{width: 393, height: 852, background: M.uiAlt, fontFamily: M.sans, color: M.uiInk, position: 'relative', overflow: 'hidden'}}>
      <div style={{position: 'absolute', top: 64, left: 22, right: 22, display: 'flex', alignItems: 'center', gap: 10, fontSize: 19, fontWeight: 650}}>
        <span style={{fontSize: 26, color: M.uiInk3}}>‹</span> Pay to bank account
      </div>
      {/* payee */}
      <div style={{position: 'absolute', top: 118, left: 18, right: 18, background: M.ui, borderRadius: 20, padding: 18, boxShadow: '0 0 0 1px rgba(0,0,0,0.06)', display: 'flex', gap: 14, alignItems: 'center'}}>
        <div style={{width: 52, height: 52, borderRadius: 26, background: '#FFF3DE', color: '#8F5200', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 21}}>RK</div>
        <div>
          <div style={{fontSize: 18, fontWeight: 650}}>R. Kumar</div>
          <div style={{fontFamily: M.mono, fontSize: 14.5, color: M.uiInk3, marginTop: 3}}>SBIN0001234 · 0001112 2233</div>
        </div>
      </div>
      {/* amount */}
      <div style={{position: 'absolute', top: 262, left: 0, right: 0, textAlign: 'center'}}>
        <div style={{fontSize: 15, color: M.uiInk3, fontWeight: 550}}>Amount</div>
        <div style={{fontSize: 64, fontWeight: 760, letterSpacing: '-0.045em', marginTop: 4, opacity: tb(f, b, amountAt, amountAt + 0.3)}}>₹48,000</div>
        <div style={{display: 'inline-block', marginTop: 12, padding: '8px 14px', borderRadius: 999, background: M.ui, boxShadow: '0 0 0 1px rgba(0,0,0,0.06)', fontSize: 14.5, color: M.uiInk3}}>
          “Refundable KYC deposit”
        </div>
      </div>
      {/* keypad hint */}
      <div style={{position: 'absolute', top: 470, left: 30, right: 30, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', rowGap: 18, opacity: 0.35, textAlign: 'center', fontSize: 26, fontWeight: 500}}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
          <div key={k}>{k}</div>
        ))}
      </div>
      {/* button */}
      <div
        style={{
          position: 'absolute',
          left: 22,
          right: 22,
          bottom: 52,
          height: 62,
          borderRadius: 999,
          background: M.uiInk,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          fontSize: 19,
          fontWeight: 650,
          transform: `scale(${press})`,
        }}
      >
        {busy ? <div style={{width: 20, height: 20, borderRadius: 10, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', transform: `rotate(${spin}deg)`}} /> : null}
        {btnLabel}
      </div>
      <Tap f={f} at={tap} x={196} y={852 - 52 - 31} size={70} color="#ffffff" />
      {/* result */}
      {mode === 'pay' ? (
        <div style={{position: 'absolute', inset: 0, background: M.ui, opacity: clamp01(tween(f, res, res + ms(fps, 220), 0, 1)), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14}}>
          <div style={{transform: `scale(${0.6 + 0.4 * resP})`}}>
            <Check f={f} at={res + 2} size={110} bg="#1FA463" />
          </div>
          <div style={{fontSize: 44, fontWeight: 760, letterSpacing: '-0.04em', marginTop: 10}}>₹48,000 paid</div>
          <div style={{fontFamily: M.mono, fontSize: 15, color: M.uiInk3}}>to SBIN0001234 · ••••2233</div>
          <div style={{fontSize: 15, color: M.uiInk3, marginTop: 4}}>UPI ref 4831 0092 7716</div>
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            left: 14,
            right: 14,
            bottom: 128,
            borderRadius: 22,
            padding: 20,
            background: M.badWash,
            color: M.bad,
            boxShadow: '0 20px 50px rgba(194,52,31,0.18), 0 0 0 1px rgba(194,52,31,0.18)',
            transform: `translateY(${(1 - resP) * 60}px)`,
            opacity: clamp01(tween(f, res, res + ms(fps, 180), 0, 1)),
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
            <div style={{width: 40, height: 40, borderRadius: 20, background: M.bad, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 24, fontWeight: 700}}>✕</div>
            <div style={{fontSize: 23, fontWeight: 750, letterSpacing: '-0.02em'}}>Payment blocked</div>
          </div>
          <div style={{fontSize: 16, color: '#5A2A22', marginTop: 10, lineHeight: 1.4}}>Reported by 3 independent banks. Threshold 3 of 3.</div>
          <div style={{fontFamily: M.mono, fontSize: 13.5, color: '#8A4A40', marginTop: 8, opacity: tb(f, b, resultAt + 3, resultAt + 4)}}>No transaction was created for this check.</div>
        </div>
      )}
    </div>
  );
};
