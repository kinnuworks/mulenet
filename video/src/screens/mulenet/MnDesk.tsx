// Bank desk from the MuleNet console (light UI, logical 1100×640): pick bank, type the account,
// attach evidence, click Report → "Generating zero-knowledge proof…" → confirmed.
import React from 'react';
import {EASE, ms, tween, clamp01, keys} from '../../lib/motion';
import {TypeText} from '../../components/Extras';
import {Cursor} from '../../components/UI';
import {ScreenProps} from '../types';
import {M, tb} from './shared';

type P = ScreenProps & {typeAt?: number; clickAt?: number; doneAt?: number; bank?: string};

export const MnDesk: React.FC<P> = ({f, b, fps, typeAt = 1, clickAt = 6, doneAt = 10, bank = 'HDFC'}) => {
  const click = b(clickAt);
  const press = keys(f, [[click - 3, 1], [click, 0.95, EASE.premium], [click + 8, 1, EASE.premium]]);
  const proving = f >= click && f < b(doneAt);
  const prog = clamp01(tween(f, click, b(doneAt), 0, 1, EASE.sine));
  const done = f >= b(doneAt);
  const banks = ['SBI', 'HDFC', 'ICICI', 'Axis', 'Kotak'];
  return (
    <div style={{width: 1100, height: 640, background: M.ui, color: M.uiInk, fontFamily: M.sans, padding: 40, boxSizing: 'border-box', position: 'relative'}}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <div style={{fontSize: 15, fontWeight: 650, letterSpacing: '0.11em', textTransform: 'uppercase', color: M.uiInk3}}>Bank desk</div>
        <div style={{fontFamily: M.mono, fontSize: 15, color: M.uiInk3}}>mulenet · midnight</div>
      </div>
      <div style={{display: 'inline-flex', gap: 3, padding: 5, borderRadius: 999, background: 'rgba(0,0,0,0.045)', marginTop: 22}}>
        {banks.map((bk) => (
          <div key={bk} style={{padding: '10px 22px', borderRadius: 999, fontSize: 18, fontWeight: 600, background: bk === bank ? '#fff' : 'transparent', color: bk === bank ? M.uiInk : M.uiInk3, boxShadow: bk === bank ? '0 0 0 .5px rgba(0,0,0,.1), 0 1px 2px rgba(0,0,0,.06), 0 6px 18px rgba(0,0,0,.06)' : undefined}}>
            {bk}
          </div>
        ))}
      </div>
      <div style={{marginTop: 28, fontSize: 16, color: M.uiInk3}}>Account (IFSC : number)</div>
      <div style={{marginTop: 8, height: 58, borderRadius: 12, boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.14)`, display: 'flex', alignItems: 'center', padding: '0 18px', fontFamily: M.mono, fontSize: 24}}>
        <TypeText f={f} text="SBIN0001234:00011122233" at={b(typeAt)} cps={20} caretColor={M.uiInk} />
      </div>
      <div style={{marginTop: 22, fontSize: 16, color: M.uiInk3}}>Evidence · stays at this bank, only a salted hash is committed</div>
      <div style={{marginTop: 8, height: 58, borderRadius: 12, boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.14)`, display: 'flex', alignItems: 'center', padding: '0 18px', fontSize: 20, color: '#3A3A3C'}}>
        <TypeText f={f} text="Victim complaint: fake KYC call, ₹48,000 via UPI" at={b(typeAt + 2.6)} cps={34} caret={false} />
      </div>
      <div style={{marginTop: 28, display: 'flex', alignItems: 'center', gap: 16}}>
        <div style={{height: 54, padding: '0 30px', borderRadius: 999, background: M.uiInk, color: '#fff', display: 'flex', alignItems: 'center', fontSize: 19, fontWeight: 650, transform: `scale(${press})`}}>
          {proving ? 'Proving…' : 'Report mule'}
        </div>
        <div style={{height: 54, padding: '0 26px', borderRadius: 999, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.14)', display: 'flex', alignItems: 'center', fontSize: 19, fontWeight: 600}}>Retract my report</div>
      </div>
      <div style={{position: 'absolute', left: 40, right: 40, bottom: 36, opacity: clamp01(tween(f, click, click + ms(fps, 200), 0, 1))}}>
        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 17, color: done ? M.ok : M.uiInk3, fontWeight: 600}}>
          <span>{done ? 'Report confirmed on chain' : 'Generating zero-knowledge proof locally…'}</span>
          <span style={{fontFamily: M.mono}}>{done ? 'tx 706f8c16…77b9' : `${Math.round(prog * 100)}%`}</span>
        </div>
        <div style={{marginTop: 10, height: 8, borderRadius: 4, background: 'rgba(0,0,0,0.07)', overflow: 'hidden'}}>
          <div style={{width: `${prog * 100}%`, height: '100%', background: done ? M.ok : M.uiInk}} />
        </div>
      </div>
      <Cursor
        f={f}
        path={[
          [b(typeAt + 4), 900, 600],
          [click - 2, 150, 470],
          [click + ms(fps, 700), 190, 520],
        ]}
        clicks={[click]}
        color={M.uiInk}
        showFrom={b(typeAt + 4)}
        size={30}
      />
      <div style={{position: 'absolute', right: 40, top: 92, opacity: tb(f, b, doneAt, doneAt + 0.5), fontSize: 16, fontWeight: 650, color: M.ok, background: M.okWash, padding: '8px 14px', borderRadius: 999}}>✓ Confirmed</div>
    </div>
  );
};
