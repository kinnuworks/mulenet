// Regulator appeals table (light console UI, logical 1240×560). The hijacked account's row flips
// from Flagged 3/3 to Cleared 0/3 and its round steps to 1 when the appeal is upheld.
import React from 'react';
import {EASE, keys, clamp01, sp} from '../../lib/motion';
import {Cursor} from '../../components/UI';
import {ScreenProps} from '../types';
import {M, tb} from './shared';

type P = ScreenProps & {clickAt?: number; flipAt?: number};

const Pill: React.FC<{kind: 'bad' | 'warn' | 'ok'; children: React.ReactNode; scale?: number}> = ({kind, children, scale = 1}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      height: 36,
      padding: '0 16px',
      borderRadius: 999,
      fontSize: 18,
      fontWeight: 650,
      background: kind === 'bad' ? M.badWash : kind === 'warn' ? '#FFF3DE' : M.okWash,
      color: kind === 'bad' ? M.bad : kind === 'warn' ? '#8F5200' : M.ok,
      transform: `scale(${scale})`,
    }}
  >
    {children}
  </span>
);

export const MnRegistry: React.FC<P> = ({f, b, fps, clickAt = 4, flipAt = 5}) => {
  const click = b(clickAt);
  const press = keys(f, [[click - 3, 1], [click, 0.95, EASE.premium], [click + 8, 1, EASE.premium]]);
  const flipped = f >= b(flipAt);
  const pop = clamp01(sp(f, b(flipAt), fps, 0.55, 2.6));
  const hl = tb(f, b, flipAt - 1.2, flipAt - 0.6) * (1 - tb(f, b, flipAt + 2, flipAt + 3));
  const rows: Array<{tag: string; who: string; n: string; round: string; kind: 'bad' | 'warn' | 'ok'; label: string; target?: boolean}> = [
    {tag: '2da36419…b59e8757', who: 'Mule A', n: '3/3', round: '0', kind: 'bad', label: 'Flagged'},
    {tag: '55033267…b5769389', who: 'Hijacked', n: flipped ? '0/3' : '3/3', round: flipped ? '1' : '0', kind: flipped ? 'ok' : 'bad', label: flipped ? 'Cleared' : 'Flagged', target: true},
    {tag: 'dca49a58…6bf34c6a', who: 'Mule B', n: '0/3', round: '0', kind: 'ok', label: 'Retracted'},
  ];
  return (
    <div style={{width: 1240, height: 560, background: M.ui, color: M.uiInk, fontFamily: M.sans, padding: 40, boxSizing: 'border-box', position: 'relative'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{fontSize: 15, fontWeight: 650, letterSpacing: '0.11em', textTransform: 'uppercase', color: M.uiInk3}}>Regulator · appeals</div>
        <div style={{height: 48, padding: '0 24px', borderRadius: 999, background: M.uiInk, color: '#fff', display: 'flex', alignItems: 'center', fontSize: 17, fontWeight: 650, transform: `scale(${press})`}}>Uphold appeal & delist</div>
      </div>
      <div style={{marginTop: 30, display: 'grid', gridTemplateColumns: '1.6fr 0.8fr 0.6fr 0.9fr', fontSize: 15, fontWeight: 600, color: M.uiInk3, paddingBottom: 12, borderBottom: `1px solid ${M.uiLine}`}}>
        <span>Account tag</span>
        <span>Reports</span>
        <span>Round</span>
        <span>Status</span>
      </div>
      {rows.map((r) => (
        <div key={r.tag} style={{display: 'grid', gridTemplateColumns: '1.6fr 0.8fr 0.6fr 0.9fr', alignItems: 'center', padding: '20px 0', borderBottom: `1px solid ${M.uiLine}`, background: r.target ? `rgba(247,160,40,${0.12 * hl})` : undefined, margin: '0 -12px', paddingLeft: 12, paddingRight: 12, borderRadius: 12}}>
          <span>
            <span style={{fontFamily: M.mono, fontSize: 21}}>{r.tag}</span>
            <span style={{display: 'block', fontFamily: M.mono, fontSize: 14, color: M.uiInk3, marginTop: 4}}>{r.who} · label known only to this browser</span>
          </span>
          <span style={{fontFamily: M.mono, fontSize: 22}}>{r.n}</span>
          <span style={{fontFamily: M.mono, fontSize: 22, color: r.target && flipped ? '#8F5200' : M.uiInk}}>{r.round}</span>
          <span>
            <Pill kind={r.kind} scale={r.target && flipped ? 0.85 + 0.15 * pop : 1}>{r.label}</Pill>
          </span>
        </div>
      ))}
      <Cursor
        f={f}
        path={[
          [b(clickAt - 2), 700, 420],
          [click - 2, 1040, 64],
          [click + 20, 1000, 120],
        ]}
        clicks={[click]}
        color={M.uiInk}
        showFrom={b(clickAt - 2)}
        size={30}
      />
    </div>
  );
};
