// The mule ring (logical 2600×1500, chrome "none"). One world reused across three scenes:
//  phase 'split'   → money leaves the phone and fans out across 12 accounts at 5 banks,
//                    each bank lights up seeing only its piece, then the ring is drawn.
//  phase 'blocked' → banks try to link up; every link breaks (law, secrecy).
//  phase 'reveal'  → the whole network collapses into the MuleNet mark.
import React from 'react';
import {EASE, ms, sp, tween, clamp01, keys} from '../../lib/motion';
import {ScreenProps} from '../types';
import {M, bez, bezPath, lerp, tb} from './shared';

type Pt = [number, number];
const S: Pt = [560, 750]; // where money leaves the phone

const BANKS: Array<{name: string; c: Pt}> = [
  {name: 'SBI', c: [1160, 330]},
  {name: 'HDFC', c: [1790, 300]},
  {name: 'ICICI', c: [2300, 700]},
  {name: 'Axis', c: [1980, 1190]},
  {name: 'Kotak', c: [1330, 1170]},
];
const BW = 500;
const BH = 310;

// 12 accounts; bank index; position; masked id
const ACC: Array<{bank: number; p: Pt; id: string}> = [
  {bank: 0, p: [1080, 300], id: '2233'}, // 0 first hop
  {bank: 0, p: [1270, 380], id: '7810'},
  {bank: 1, p: [1700, 260], id: '9988'}, // 2 first hop
  {bank: 1, p: [1900, 250], id: '4410'},
  {bank: 1, p: [1820, 360], id: '0562'},
  {bank: 2, p: [2230, 650], id: '3197'},
  {bank: 2, p: [2390, 760], id: '8823'},
  {bank: 3, p: [1890, 1150], id: '6671'},
  {bank: 3, p: [2080, 1130], id: '1209'},
  {bank: 3, p: [1990, 1250], id: '5543'},
  {bank: 4, p: [1250, 1130], id: '4402'}, // 10 first hop
  {bank: 4, p: [1420, 1220], id: '7735'},
];
const HOP1: Array<{to: number; amt: string}> = [
  {to: 0, amt: '16,000'},
  {to: 2, amt: '16,000'},
  {to: 10, amt: '16,000'},
];
const HOP2: Array<{from: number; to: number; amt: string}> = [
  {from: 0, to: 1, amt: '6,000'},
  {from: 0, to: 5, amt: '5,000'},
  {from: 0, to: 7, amt: '5,000'},
  {from: 2, to: 3, amt: '6,000'},
  {from: 2, to: 4, amt: '5,000'},
  {from: 2, to: 6, amt: '5,000'},
  {from: 10, to: 8, amt: '6,000'},
  {from: 10, to: 9, amt: '5,000'},
  {from: 10, to: 11, amt: '5,000'},
];

const ctrl = (a: Pt, c: Pt, bendK = 0.28): [Pt, Pt] => {
  const dx = c[0] - a[0];
  const dy = c[1] - a[1];
  // perpendicular bend so paths arc instead of running straight
  const nx = -dy * bendK;
  const ny = dx * bendK;
  return [
    [a[0] + dx * 0.33 + nx, a[1] + dy * 0.33 + ny],
    [a[0] + dx * 0.66 + nx * 0.6, a[1] + dy * 0.66 + ny * 0.6],
  ];
};

// The mark's three nodes (big), centred on the network.
const MARK_C: Pt = [1700, 740];
const MK = 13; // scale of the 64-unit mark
const markPt = (x: number, y: number): Pt => [MARK_C[0] + (x - 32) * MK, MARK_C[1] + (y - 33) * MK];
const MARK_NODES: Pt[] = [markPt(20, 22), markPt(44, 22), markPt(32, 44)];

type P = ScreenProps & {
  phase?: 'split' | 'blocked' | 'reveal';
  hop1At?: number;
  hop2At?: number;
  hopBeats?: number;
  spot?: number[];
  ringAt?: number;
  linkAt?: number;
  breakAt?: number;
  accuseAt?: number;
  collapseAt?: number;
  nameAt?: number;
};

export const MnNetwork: React.FC<P> = ({f, b, fps, phase = 'split', hop1At = 8.8, hop2At = 11.2, hopBeats = 1.8, spot = [], ringAt = 24, linkAt = 1, breakAt = 4.5, accuseAt = 7, collapseAt = 0.5, nameAt = 3.5}) => {
  const done = phase !== 'split';
  // progress of a hop: 0..1
  const hp = (startBeat: number) => (done ? 1 : tb(f, b, startBeat, startBeat + hopBeats, EASE.move));
  const arrivals: number[] = new Array(ACC.length).fill(done ? 1 : 0);
  const amounts: string[] = new Array(ACC.length).fill('');
  const flows: Array<{a: Pt; c: Pt; t: number; key: string; amt: string}> = [];
  HOP1.forEach((h, i) => {
    const t = hp(hop1At + i * 0.35);
    flows.push({a: S, c: ACC[h.to].p, t, key: `h1${i}`, amt: h.amt});
    arrivals[h.to] = done ? 1 : t >= 1 ? 1 : 0;
    amounts[h.to] = h.amt;
  });
  HOP2.forEach((h, i) => {
    const st = hop2At + Math.floor(i / 3) * 0.35 + (i % 3) * 0.22;
    const t = hp(st);
    flows.push({a: ACC[h.from].p, c: ACC[h.to].p, t, key: `h2${i}`, amt: h.amt});
    arrivals[h.to] = done ? 1 : t >= 1 ? 1 : 0;
    amounts[h.to] = h.amt;
  });

  // spotlight: one bank at a time sees only its own piece
  let lit = -1;
  if (phase === 'split') spot.forEach((s, i) => (f >= b(s) ? (lit = i) : null));
  const spotOn = phase === 'split' && spot.length > 0 && f >= b(spot[0]) && f < b(ringAt);
  const ring = phase === 'split' ? tb(f, b, ringAt, ringAt + 1.6, EASE.move) : 1;

  // reveal: everything converges into the mark
  const col = phase === 'reveal' ? tb(f, b, collapseAt, collapseAt + 2, EASE.move) : 0;
  const markDraw = phase === 'reveal' ? tb(f, b, collapseAt + 1.6, collapseAt + 2.6, EASE.premium) : 0;
  const markRing = phase === 'reveal' ? tb(f, b, collapseAt + 2.2, collapseAt + 3.2, EASE.premium) : 0;
  const netFade = 1 - col;

  // blocked links between neighbouring banks
  const LINKS: Array<[number, number]> = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]];

  const clock = done ? 6 * 60 + 40 : Math.round(tween(f, b(hop1At), b(hop2At + 2.4), 0, 400, EASE.sine));
  const mm = Math.floor(clock / 60);
  const ss = clock % 60;

  return (
    <div style={{width: 2600, height: 1500, position: 'relative', fontFamily: M.sans}}>
      <svg width={2600} height={1500} style={{position: 'absolute', inset: 0}}>
        {/* bank boxes */}
        {BANKS.map((bk, i) => {
          const isLit = spotOn && lit === i;
          const dim = spotOn && !isLit ? 0.22 : 1;
          return (
            <rect
              key={bk.name}
              x={bk.c[0] - BW / 2}
              y={bk.c[1] - BH / 2}
              width={BW}
              height={BH}
              rx={36}
              fill={isLit ? 'rgba(247,160,40,0.10)' : 'rgba(255,255,255,0.045)'}
              stroke={isLit ? M.amber : 'rgba(255,255,255,0.22)'}
              strokeWidth={isLit ? 5 : 2.5}
              opacity={dim * netFade}
            />
          );
        })}
        {/* money paths */}
        {flows.map((fl) => {
          const [c1, c2] = ctrl(fl.a, fl.c);
          const d = bezPath(fl.a, c1, c2, fl.c, fl.t);
          const toBank = ACC.find((a) => a.p === fl.c)?.bank ?? -1;
          const dim = spotOn && toBank !== lit ? 0.18 : 1;
          return d ? <path key={fl.key} d={d} fill="none" stroke={M.amber} strokeWidth={6} strokeLinecap="round" opacity={0.6 * dim * netFade} /> : null;
        })}
        {/* blocked links */}
        {phase === 'blocked'
          ? LINKS.map(([i, j], k) => {
              const a = BANKS[i].c;
              const c = BANKS[j].c;
              const t = tb(f, b, linkAt + k * 0.25, linkAt + k * 0.25 + 1.4, EASE.move);
              const br = tb(f, b, breakAt + k * 0.15, breakAt + k * 0.15 + 0.6, EASE.premium);
              const mid: Pt = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
              // draw toward the midpoint, then snap back from it when the link breaks
              const reach = 0.5 * t * (1 - 0.22 * br);
              const p1: Pt = [lerp(a[0], c[0], reach), lerp(a[1], c[1], reach)];
              const p2: Pt = [lerp(c[0], a[0], reach), lerp(c[1], a[1], reach)];
              const col2 = br > 0 ? M.red : M.amber;
              return (
                <g key={k}>
                  <line x1={a[0]} y1={a[1]} x2={p1[0]} y2={p1[1]} stroke={col2} strokeWidth={7} strokeDasharray="14 12" strokeLinecap="round" />
                  <line x1={c[0]} y1={c[1]} x2={p2[0]} y2={p2[1]} stroke={col2} strokeWidth={7} strokeDasharray="14 12" strokeLinecap="round" />
                  {br > 0 ? <circle cx={mid[0]} cy={mid[1]} r={30 * br} fill={M.red} opacity={0.18} /> : null}
                </g>
              );
            })
          : null}
        {/* the ring: dashed ellipse revealed along its own path through a mask */}
        <defs>
          <mask id="ringMask">
            <ellipse cx={1720} cy={735} rx={820} ry={600} fill="none" stroke="#fff" strokeWidth={24} pathLength={1} strokeDasharray={`${ring} 1`} transform="rotate(-150 1720 735)" />
          </mask>
        </defs>
        {phase !== 'reveal' && ring > 0 ? (
          <ellipse cx={1720} cy={735} rx={820} ry={600} fill="none" stroke={M.red} strokeWidth={11} strokeDasharray="38 24" strokeLinecap="round" mask="url(#ringMask)" opacity={phase === 'blocked' ? 0.35 : 1} />
        ) : null}
        {/* mark lines in reveal */}
        {phase === 'reveal' && markDraw > 0 ? (
          <path
            d={`M${MARK_NODES[0][0]} ${MARK_NODES[0][1]} L${MARK_NODES[2][0]} ${MARK_NODES[2][1]} L${MARK_NODES[1][0]} ${MARK_NODES[1][1]} L${MARK_NODES[0][0]} ${MARK_NODES[0][1]}`}
            fill="none"
            stroke="#fff"
            strokeWidth={30}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.55}
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset={1 - markDraw}
          />
        ) : null}
        {phase === 'reveal' && markRing > 0 ? (
          <circle cx={MARK_NODES[2][0]} cy={MARK_NODES[2][1]} r={10 * MK} fill="none" stroke={M.amber} strokeWidth={30} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - markRing} transform={`rotate(-90 ${MARK_NODES[2][0]} ${MARK_NODES[2][1]})`} />
        ) : null}
      </svg>

      {/* bank labels */}
      {BANKS.map((bk, i) => {
        const isLit = spotOn && lit === i;
        const dim = spotOn && !isLit ? 0.25 : 1;
        const inP = done ? 1 : tb(f, b, hop1At - 1.2 + i * 0.12, hop1At - 0.2 + i * 0.12);
        return (
          <div
            key={bk.name}
            style={{position: 'absolute', left: bk.c[0] - BW / 2 + 26, top: bk.c[1] - BH / 2 + 20, fontSize: 54, fontWeight: 760, letterSpacing: '-0.03em', color: isLit ? M.amberHi : M.ink, opacity: dim * inP * netFade, display: 'flex', gap: 12, alignItems: 'baseline'}}
          >
            {bk.name}
            {isLit ? <span style={{fontFamily: M.mono, fontSize: 30, color: M.amber, fontWeight: 500}}>sees 1 piece</span> : null}
          </div>
        );
      })}

      {/* accounts */}
      {ACC.map((a, i) => {
        const arrivedAt = (() => {
          if (done) return -1e6;
          const h1 = HOP1.findIndex((h) => h.to === i);
          if (h1 >= 0) return b(hop1At + h1 * 0.35 + hopBeats);
          const h2 = HOP2.findIndex((h) => h.to === i);
          return b(hop2At + Math.floor(h2 / 3) * 0.35 + (h2 % 3) * 0.22 + hopBeats);
        })();
        const k = done ? 1 : clamp01(sp(f, arrivedAt, fps, 0.6, 2.6));
        if (!done && f < arrivedAt) return null;
        const dim = spotOn && a.bank !== lit ? 0.2 : 1;
        // in reveal, nodes fly into the three mark nodes
        const target = MARK_NODES[i % 3];
        const x = lerp(a.p[0], target[0], col);
        const y = lerp(a.p[1], target[1], col);
        const r = lerp(22, 5 * MK, col);
        return (
          <React.Fragment key={i}>
            <div style={{position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: r, background: col > 0.6 ? '#fff' : M.amber, boxShadow: col < 0.5 ? `0 0 ${24 * k}px rgba(247,160,40,0.6)` : undefined, transform: `scale(${k})`, opacity: dim * (col > 0 ? 1 : 1)}} />
            <div
              style={{
                position: 'absolute',
                left: a.p[0] + 32,
                top: a.p[1] - 26,
                padding: '6px 12px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                fontFamily: M.mono,
                fontSize: 30,
                color: M.ink,
                whiteSpace: 'nowrap',
                opacity: dim * clamp01(k * 1.4) * netFade,
                transform: `translateY(${(1 - k) * 10}px)`,
              }}
            >
              ••{a.id} <span style={{color: M.amber}}>₹{amounts[i]}</span>
            </div>
          </React.Fragment>
        );
      })}

      {/* money chips riding the paths */}
      {!done
        ? flows.map((fl) => {
            if (fl.t <= 0 || fl.t >= 1) return null;
            const [c1, c2] = ctrl(fl.a, fl.c);
            const [x, y] = bez(fl.a, c1, c2, fl.c, fl.t);
            return (
              <div key={`chip-${fl.key}`} style={{position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', padding: '6px 12px', borderRadius: 999, background: M.amber, color: '#2A1700', fontWeight: 780, fontSize: 34, whiteSpace: 'nowrap', boxShadow: '0 6px 24px rgba(247,160,40,0.45)'}}>
                ₹{fl.amt}
              </div>
            );
          })
        : null}

      {/* clock */}
      {phase === 'split' ? (
        <div style={{position: 'absolute', left: 1600, top: 40, fontFamily: M.mono, fontSize: 44, color: M.muted, opacity: tb(f, b, hop1At - 0.5, hop1At + 0.3) * (1 - tb(f, b, ringAt - 0.5, ringAt))}}>
          T+{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
        </div>
      ) : null}

      {/* ring label */}
      {phase === 'split' ? (
        <div style={{position: 'absolute', left: 2330, top: 110, fontSize: 72, fontWeight: 800, color: M.red, letterSpacing: '-0.02em', opacity: tb(f, b, ringAt + 1, ringAt + 1.6)}}>the ring</div>
      ) : null}

      {/* blocked: law chip */}
      {phase === 'blocked' ? (
        <div
          style={{
            position: 'absolute',
            left: 1720,
            top: 735,
            transform: `translate(-50%, -50%) scale(${0.7 + 0.3 * clamp01(sp(f, b(breakAt + 0.4), fps, 0.7, 2.4))})`,
            opacity: tb(f, b, breakAt + 0.4, breakAt + 0.9),
            padding: '18px 28px',
            borderRadius: 22,
            background: 'rgba(255,90,71,0.10)',
            border: `2px solid ${M.red}`,
            color: M.ink,
            fontSize: 50,
            fontWeight: 720,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            whiteSpace: 'nowrap',
          }}
        >
          <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={M.red} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3" /></svg> Data protection law · bank secrecy
        </div>
      ) : null}
      {phase === 'blocked' ? (
        <div style={{position: 'absolute', left: 1720, top: 880, transform: 'translate(-50%, 0)', fontFamily: M.mono, fontSize: 36, color: M.muted, opacity: tb(f, b, accuseAt, accuseAt + 0.6), whiteSpace: 'nowrap'}}>
          “Is that your customer?” — no bank wants to ask
        </div>
      ) : null}
    </div>
  );
};

// keys and ms kept for parity with other screens
void keys;
void ms;
