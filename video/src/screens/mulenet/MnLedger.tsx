// What the chain sees (dark, logical 1600×860). Left: the public ledger types itself out, and
// rows light up as the voice names them. Right: what never leaves a bank, sealed one by one.
import React from 'react';
import {EASE, clamp01, sp} from '../../lib/motion';
import {ScreenProps} from '../types';
import {M, tb} from './shared';
import receipt from './receipt.json';

type P = ScreenProps & {typeAt?: number; tagsAt?: number; countsAt?: number; nullAt?: number; sealAt?: number};

export const MnLedger: React.FC<P> = ({f, b, fps, typeAt = 0, tagsAt = 4, countsAt = 6, nullAt = 8, sealAt = 10}) => {
  const fs = receipt.finalState;
  const lines: Array<[string, string, 'tags' | 'counts' | 'null' | '']> = [
    ['regulator', 'H(regulatorSecret)', ''],
    ['threshold', String(fs.threshold), ''],
    ['banks.root', `${fs.bankTreeRoot.slice(0, 12)}…`, ''],
    ['flagged', `{ ${fs.flagged[0].slice(0, 10)}… }`, 'tags'],
    ['reportCount', `{ ${fs.reportCounts[1].tag.slice(0, 8)}… → ${fs.reportCounts[1].count}, … }`, 'counts'],
    ['reportRound', `{ ${fs.reportCounts[0].tag.slice(0, 8)}… → ${fs.reportCounts[0].round} }`, 'counts'],
    ['nullifiers', `Set(${fs.nullifiers})`, 'null'],
    ['evidenceCommitments', `Set(${fs.evidenceCommitments})`, ''],
    ['totalReports', String(fs.totalReports), ''],
  ];
  const hlFor = (k: string) => (k === 'tags' ? tagsAt : k === 'counts' ? countsAt : k === 'null' ? nullAt : -1);
  const priv = ['Account numbers', 'Which bank reported', 'Evidence documents', 'Who checked whom', 'Bank & regulator secrets'];
  return (
    <div style={{width: 1600, height: 860, position: 'relative', fontFamily: M.sans}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 900, height: 860, borderRadius: 28, background: '#101217', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden'}}>
        <div style={{height: 56, display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px', background: '#16181E', borderBottom: '1px solid rgba(255,255,255,0.06)'}}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
            <div key={c} style={{width: 14, height: 14, borderRadius: 7, background: c}} />
          ))}
          <div style={{marginLeft: 18, fontFamily: M.mono, fontSize: 18, color: M.muted}}>public ledger · {receipt.contractAddress.slice(0, 10)}…</div>
        </div>
        <div style={{padding: '30px 34px', fontFamily: M.mono, fontSize: 27, lineHeight: 2.02}}>
          {lines.map(([k, v, kind], i) => {
            const vis = tb(f, b, typeAt + i * 0.28, typeAt + i * 0.28 + 0.4);
            const hb = hlFor(kind);
            const hl = hb >= 0 ? tb(f, b, hb, hb + 0.4) : 0;
            return (
              <div key={k} style={{opacity: vis, display: 'flex', gap: 18, padding: '0 12px', margin: '0 -12px', borderRadius: 10, background: `rgba(247,160,40,${0.16 * hl})`, whiteSpace: 'nowrap'}}>
                <span style={{color: hl > 0 ? M.amberHi : '#9AB4FF'}}>{k}</span>
                <span style={{color: '#E8E6E1'}}>{v}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{position: 'absolute', left: 960, top: 30, width: 640}}>
        <div style={{fontFamily: M.mono, fontSize: 19, color: M.muted, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: tb(f, b, sealAt - 0.5, sealAt)}}>never on chain</div>
        {priv.map((p, i) => {
          const at = sealAt + i * 0.45;
          const t = tb(f, b, at, at + 0.5, EASE.premium);
          const lock = clamp01(sp(f, b(at + 0.3), fps, 0.55, 2.6));
          return (
            <div key={p} style={{marginTop: 26, display: 'flex', alignItems: 'center', gap: 20, opacity: t, transform: `translateX(${(1 - t) * 40}px)`}}>
              <div style={{width: 56, height: 56, borderRadius: 16, background: 'rgba(61,220,151,0.12)', display: 'grid', placeItems: 'center', transform: `scale(${0.7 + 0.3 * lock})`}}>
                <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={M.green} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3" /></svg>
              </div>
              <div style={{fontSize: 36, fontWeight: 650, letterSpacing: '-0.02em', color: M.ink}}>{p}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
