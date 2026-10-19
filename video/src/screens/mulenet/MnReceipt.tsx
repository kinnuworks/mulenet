// The real run (dark, logical 1500×900): every transaction from deployments/standalone.json streams
// in with its hash and block, a counter lands on 16, and the three rejected attacks get stamped.
import React from 'react';
import {EASE, clamp01, sp, tween} from '../../lib/motion';
import {Counter} from '../../components/Type';
import {ScreenProps} from '../types';
import {M, tb} from './shared';
import receipt from './receipt.json';

type P = ScreenProps & {streamAt?: number; streamBeats?: number; countAt?: number; rejAt?: number};

export const MnReceipt: React.FC<P> = ({f, b, fps, streamAt = 0.5, streamBeats = 7, countAt = 7, rejAt = 11.5}) => {
  const txs = receipt.transactions;
  const step = streamBeats / txs.length;
  const scroll = tween(f, b(streamAt + 3), b(streamAt + streamBeats + 0.5), 0, 1, EASE.sine);
  const ROW = 50;
  const visibleH = 640;
  const maxScroll = Math.max(0, txs.length * ROW - visibleH);
  return (
    <div style={{width: 1500, height: 900, position: 'relative', fontFamily: M.sans}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 980, height: 900, borderRadius: 28, background: '#101217', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden'}}>
        <div style={{padding: '26px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)'}}>
          <div style={{fontFamily: M.mono, fontSize: 19, color: M.muted, letterSpacing: '0.1em', textTransform: 'uppercase'}}>deployments/standalone.json</div>
          <div style={{display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 999, background: 'rgba(61,220,151,0.12)', color: M.green, fontSize: 18, fontWeight: 650}}>
            <div style={{width: 9, height: 9, borderRadius: 5, background: M.green}} /> Real run · real proofs
          </div>
        </div>
        <div style={{position: 'absolute', left: 32, right: 32, top: 110, height: visibleH, overflow: 'hidden'}}>
          <div style={{transform: `translateY(${-scroll * maxScroll}px)`}}>
            {txs.map((t, i) => {
              const at = streamAt + i * step;
              const v = tb(f, b, at, at + 0.4);
              return (
                <div key={i} style={{height: ROW, display: 'grid', gridTemplateColumns: '170px 1fr 120px', alignItems: 'center', fontFamily: M.mono, fontSize: 21, opacity: v, transform: `translateY(${(1 - v) * 14}px)`, borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                  <span style={{color: '#9AB4FF'}}>{t.circuit}</span>
                  <span style={{color: '#E8E6E1'}}>{t.txHash.slice(0, 24)}…</span>
                  <span style={{color: M.muted, textAlign: 'right'}}>block {t.blockHeight}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{position: 'absolute', left: 32, bottom: 26, fontSize: 18, color: M.muted}}>Compact 0.31.1 · ledger 8 · local Midnight network</div>
      </div>
      <div style={{position: 'absolute', left: 1040, top: 40, width: 460}}>
        <div style={{fontFamily: M.mono, fontSize: 150, fontWeight: 600, color: M.amber, lineHeight: 1, opacity: tb(f, b, countAt - 0.5, countAt)}}>
          <Counter f={f} from={0} to={txs.length} f0={b(countAt - 0.5)} f1={b(countAt + 1.2)} />
        </div>
        <div style={{fontSize: 32, fontWeight: 650, color: M.ink, marginTop: 6, opacity: tb(f, b, countAt, countAt + 0.5)}}>proven transactions</div>
        <div style={{marginTop: 50, display: 'flex', flexDirection: 'column', gap: 16}}>
          {receipt.rejectedAttempts.map((r, i) => {
            const at = rejAt + i * 0.5;
            const st = clamp01(sp(f, b(at), fps, 0.5, 2.6));
            if (f < b(at)) return null;
            return (
              <div key={i} style={{transform: `rotate(-2deg) scale(${1.5 - 0.5 * st})`, transformOrigin: 'left center', opacity: clamp01(st * 2), border: `3px solid ${M.red}`, borderRadius: 14, padding: '10px 16px', color: M.red, background: 'rgba(7,8,10,0.6)'}}>
                <div style={{fontWeight: 850, fontSize: 24, letterSpacing: '0.06em'}}>REJECTED</div>
                <div style={{fontFamily: M.mono, fontSize: 16, color: '#FF9C8F', marginTop: 2}}>{r.expected}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
