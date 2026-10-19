import { useCallback, useEffect, useMemo, useState } from 'react';
import * as api from './api';
import { type Check, type Evidence, type State, short } from './api';

const DEMO_ACCOUNTS = [
  { label: 'Mule A', account: 'SBIN0001234:00011122233' },
  { label: 'Mule B', account: 'HDFC0004321:50100099988' },
  { label: 'Hijacked', account: 'UTIB0000999:918010045671' },
  { label: 'Shopkeeper', account: 'ICIC0000777:000401500123' },
];

const Icon = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const I = {
  shield: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  scale: 'M12 3v18M5 7h14M5 7l-3 7a4 4 0 0 0 6 0L5 7zM19 7l-3 7a4 4 0 0 0 6 0l-3-7',
  lock: 'M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6L6 18',
  bank: 'M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18',
};

function useStore() {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      setState(await api.getState());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [refresh]);
  return { state, error, refresh };
}

/** Tags this browser has seen for accounts it typed: lets the operator label opaque ledger rows locally. */
function useLocalLabels() {
  const [labels, setLabels] = useState<Record<string, string>>({});
  const learn = useCallback((tag: string, account: string) => setLabels((l) => ({ ...l, [tag]: account })), []);
  return { labels, learn };
}

export default function App() {
  const { state, error, refresh } = useStore();
  const { labels, learn } = useLocalLabels();

  if (!state) {
    return (
      <main className="container boot">
        <p className="t-small">{error ? `Can't reach the MuleNet service: ${error}` : 'Connecting to the registry…'}</p>
      </main>
    );
  }

  return (
    <>
      <Nav state={state} />
      <Hero state={state} learn={learn} />
      <section id="report" className="section section--alt">
        <div className="container">
          <BankDesk state={state} onDone={refresh} learn={learn} />
        </div>
      </section>
      <section id="appeals" className="section">
        <div className="container">
          <Regulator state={state} labels={labels} onDone={refresh} learn={learn} />
        </div>
      </section>
      <section id="ledger" className="section section--alt">
        <div className="container">
          <Ledger state={state} labels={labels} />
        </div>
      </section>
      <section id="proofs" className="section">
        <div className="container">
          <Proofs state={state} />
        </div>
      </section>
      <footer className="footer">
        <div className="container">
          <span className="nav__brand">
            <img className="app-icon" src="/icon.svg" alt="" /> MuleNet
          </span>
          <span>Built on Midnight · Compact 0.31.1 · Apache-2.0</span>
          <a href="https://github.com/kinnuworks/mulenet" className="t-small">Source on GitHub</a>
        </div>
      </footer>
    </>
  );
}

function Nav({ state }: { state: State }) {
  return (
    <header className="nav">
      <div className="nav__bar">
        <a className="nav__brand" href="#top">
          <img className="app-icon" src="/icon.svg" alt="" /> MuleNet
        </a>
        <nav className="nav__links" aria-label="Sections">
          <a href="#check">Payee check</a>
          <a href="#report">Bank desk</a>
          <a href="#appeals">Appeals</a>
          <a href="#ledger">Public ledger</a>
          <a href="#proofs">Proofs</a>
        </nav>
        <span className={`badge badge--dot net ${state.live ? 'is-live' : ''}`} title={state.contractAddress}>
          {state.live ? 'Live' : 'Recorded'} · {state.network}
        </span>
      </div>
    </header>
  );
}

function Hero({ state, learn }: { state: State; learn: (t: string, a: string) => void }) {
  const r = state.registry;
  return (
    <section className="hero hero--split" id="top">
      <div className="container">
        <div>
          <span className="eyebrow">
            <Icon d={I.shield} size={14} /> Cross-bank fraud registry on Midnight
          </span>
          <h1 className="hero-title">
            Stop paying mule accounts. <span className="t-muted">Share no customer data.</span>
          </h1>
          <p className="lead">
            Banks report suspected mule accounts with a zero-knowledge proof that they are licensed, without revealing which
            bank reported or which account it is. An account is flagged only after {r.threshold} independent banks agree.
          </p>
          <dl className="stats">
            <div>
              <dt>Licensed banks</dt>
              <dd className="t-mono">{r.activeBanks}</dd>
            </div>
            <div>
              <dt>Flag threshold</dt>
              <dd className="t-mono">{r.threshold} banks</dd>
            </div>
            <div>
              <dt>Accounts flagged</dt>
              <dd className="t-mono">{r.flagged.length}</dd>
            </div>
            <div>
              <dt>Reports filed</dt>
              <dd className="t-mono">{r.totalReports}</dd>
            </div>
          </dl>
          <p className="t-micro contract">
            Contract <span className="t-mono">{short(state.contractAddress, 10)}</span> on {state.network}
          </p>
        </div>
        <PayeeCheck live={state.live} learn={learn} />
      </div>
    </section>
  );
}

function PayeeCheck({ live, learn }: { live: boolean; learn: (t: string, a: string) => void }) {
  const [account, setAccount] = useState(DEMO_ACCOUNTS[0].account);
  const [result, setResult] = useState<Check | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async (acct = account) => {
    setBusy(true);
    setErr(null);
    try {
      const c = await api.check(acct);
      setResult(c);
      learn(c.tag, acct);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stage" id="check">
      <div className="phone">
        <div className="phone__screen">
          <div className="phone__status" aria-hidden="true">
            <span>9:41</span>
            <span>5G</span>
          </div>
          <div className="phone__body pay">
            <p className="pay__title">Pay to bank account</p>
            <label className="field">
              <span>Payee IFSC : account</span>
              <input value={account} onChange={(e) => setAccount(e.target.value)} spellCheck={false} />
            </label>
            <div className="pay__amount t-mono">₹ 48,000</div>
            <div className="chips chips--tight">
              {DEMO_ACCOUNTS.map((d) => (
                <button key={d.account} className="chip chip--soft" onClick={() => { setAccount(d.account); run(d.account); }} disabled={!live}>
                  {d.label}
                </button>
              ))}
            </div>
            <button className="btn btn-candy pay__btn" onClick={() => run()} disabled={busy || !live}>
              {busy ? 'Checking…' : 'Check payee & pay'}
            </button>
            {!live && <p className="t-micro">Start the MuleNet service to run live checks.</p>}
            {err && <p className="t-micro err">{err}</p>}
            {result && (
              <div className={`verdict ${result.flagged ? 'is-bad' : 'is-ok'}`} role="status">
                <Icon d={result.flagged ? I.x : I.check} />
                <div>
                  <strong>{result.flagged ? 'Payment blocked' : 'Payee clear'}</strong>
                  <p>
                    {result.flagged
                      ? `Reported by ${result.reports} independent banks (threshold ${result.threshold}).`
                      : result.reports > 0
                        ? `${result.reports} report(s), below the threshold of ${result.threshold}.`
                        : 'No bank has reported this account.'}
                  </p>
                  <p className="t-mono tiny">No transaction was created for this check.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BankDesk({ state, onDone, learn }: { state: State; onDone: () => void; learn: (t: string, a: string) => void }) {
  const [bank, setBank] = useState(state.banks.find((b) => b.active)?.name ?? state.banks[0].name);
  const [account, setAccount] = useState(DEMO_ACCOUNTS[1].account);
  const [evidence, setEvidence] = useState('NCRP complaint: victim paid via UPI after fake KYC call');
  const [busy, setBusy] = useState<null | 'report' | 'retract'>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [log, setLog] = useState<Evidence[]>([]);

  useEffect(() => {
    if (state.live) api.evidence(bank).then(setLog).catch(() => setLog([]));
  }, [bank, state.live, state.transactions.length]);

  const act = async (kind: 'report' | 'retract') => {
    setBusy(kind);
    setMsg(null);
    try {
      const tx = kind === 'report' ? await api.report(bank, account, evidence) : await api.retract(bank, account);
      setMsg({ ok: true, text: `${kind === 'report' ? 'Report' : 'Retraction'} confirmed · tx ${short(tx.txHash, 8)}` });
      const c = await api.check(account);
      learn(c.tag, account);
      onDone();
    } catch (e) {
      setMsg({ ok: false, text: (e instanceof Error ? e.message : String(e)).replace(/^.*MuleNet: /, 'Rejected by the contract: ') });
    } finally {
      setBusy(null);
    }
  };

  const active = state.banks.find((b) => b.name === bank)?.active;

  return (
    <div className="split">
      <div>
        <span className="eyebrow">
          <Icon d={I.flag} size={14} /> Bank desk
        </span>
        <h2 className="t-h3">Report a mule. Nobody learns it was you.</h2>
        <p className="t-small">
          The report proves your bank is licensed with a Merkle membership proof, and a per-account nullifier stops you
          reporting twice. The account number, your identity and the evidence never leave this machine.
        </p>
        <div className="card desk">
          <div className="segmented" role="tablist" aria-label="Acting bank">
            {state.banks.map((b) => (
              <button key={b.name} role="tab" aria-selected={bank === b.name} onClick={() => setBank(b.name)} title={b.active ? '' : 'Licence revoked'}>
                {b.name}
                {!b.active && <span className="revoked">revoked</span>}
              </button>
            ))}
          </div>
          <label className="field">
            <span>Account (IFSC : number)</span>
            <input value={account} onChange={(e) => setAccount(e.target.value)} spellCheck={false} />
          </label>
          <label className="field">
            <span>Evidence (stays local, only its salted hash is committed)</span>
            <textarea rows={2} value={evidence} onChange={(e) => setEvidence(e.target.value)} />
          </label>
          <div className="row">
            <button className="btn btn-candy btn-sm" onClick={() => act('report')} disabled={!!busy || !state.live}>
              {busy === 'report' ? 'Proving…' : 'Report mule'}
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => act('retract')} disabled={!!busy || !state.live}>
              {busy === 'retract' ? 'Proving…' : 'Retract my report'}
            </button>
            {!active && <span className="t-micro">{bank}'s licence is revoked; its proofs will fail.</span>}
          </div>
          {busy && <p className="t-micro">Generating a zero-knowledge proof locally, then submitting. This takes a little while.</p>}
          {msg && <p className={`t-micro ${msg.ok ? 'ok' : 'err'}`} role="status">{msg.text}</p>}
        </div>
      </div>
      <div className="stage stage--soft">
        <div className="window">
          <div className="window__bar">
            <div className="lights" aria-hidden="true"><i /><i /><i /></div>
            <span className="window__title">{bank} · private evidence log</span>
          </div>
          <div className="win-body">
            <p className="t-micro">
              <Icon d={I.lock} size={13} /> Kept in {bank}'s private state only. Open one to a regulator to prove what you reported.
            </p>
            {log.length === 0 ? (
              <p className="t-small empty">No reports filed by {bank} from this console yet.</p>
            ) : (
              <table className="tbl">
                <thead>
                  <tr><th>Account tag</th><th>Evidence hash</th><th>Salt</th></tr>
                </thead>
                <tbody>
                  {log.map((e, i) => (
                    <tr key={i}>
                      <td className="t-mono">{short(e.tag)}</td>
                      <td className="t-mono">{short(e.evidenceHash)}</td>
                      <td className="t-mono">{short(e.salt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Regulator({ state, labels, onDone, learn }: { state: State; labels: Record<string, string>; onDone: () => void; learn: (t: string, a: string) => void }) {
  const [account, setAccount] = useState(DEMO_ACCOUNTS[0].account);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const rows = state.registry.reportCounts.filter((r) => r.count > 0 || r.round > 0);

  const delist = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const tx = await api.delist(account);
      const c = await api.check(account);
      learn(c.tag, account);
      setMsg({ ok: true, text: `Delisted · tx ${short(tx.txHash, 8)}` });
      onDone();
    } catch (e) {
      setMsg({ ok: false, text: (e instanceof Error ? e.message : String(e)).replace(/^.*MuleNet: /, 'Rejected by the contract: ') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="split split--flip">
      <div>
        <span className="eyebrow">
          <Icon d={I.scale} size={14} /> Regulator · appeals
        </span>
        <h2 className="t-h3">Wrongly flagged? Appeal once, start a clean round.</h2>
        <p className="t-small">
          The regulator sees only opaque tags. When a customer proves their account was hijacked, the regulator delists it.
          The count resets and a new round begins, so old reports can't be replayed.
        </p>
        <div className="card desk">
          <label className="field">
            <span>Account from the appeal file</span>
            <input value={account} onChange={(e) => setAccount(e.target.value)} spellCheck={false} />
          </label>
          <div className="row">
            <button className="btn btn-ink btn-sm" onClick={delist} disabled={busy || !state.live}>
              {busy ? 'Proving…' : 'Uphold appeal & delist'}
            </button>
          </div>
          {msg && <p className={`t-micro ${msg.ok ? 'ok' : 'err'}`} role="status">{msg.text}</p>}
        </div>
      </div>
      <div className="card card--raised regtable">
        <table className="tbl">
          <thead>
            <tr><th>Account tag</th><th>Reports</th><th>Round</th><th>Status</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.tag}>
                <td>
                  <span className="t-mono">{short(r.tag)}</span>
                  {labels[r.tag] && <span className="known">{labels[r.tag]}</span>}
                </td>
                <td className="t-mono">{r.count}/{state.registry.threshold}</td>
                <td className="t-mono">{r.round}</td>
                <td>
                  <span className={`pill ${r.flagged ? 'pill--bad' : r.count ? 'pill--warn' : 'pill--ok'}`}>
                    {r.flagged ? 'Flagged' : r.count ? 'Watching' : 'Cleared'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="t-micro">Names appear only for accounts typed in this browser; the chain stores tags.</p>
      </div>
    </div>
  );
}

function Ledger({ state, labels }: { state: State; labels: Record<string, string> }) {
  const r = state.registry;
  const lines = useMemo(
    () => [
      ['regulator', 'H(regulatorSecret)'],
      ['threshold', String(r.threshold)],
      ['banks.root', short(r.bankTreeRoot, 10)],
      ['activeBanks', String(r.activeBanks)],
      ['flagged', `Set(${r.flagged.length})  ${r.flagged.map((t) => short(t, 4)).join(' ')}`],
      ['reportCount', `Map(${r.reportCounts.length})`],
      ['nullifiers', `Set(${r.nullifiers})`],
      ['evidenceCommitments', `Set(${r.evidenceCommitments})`],
      ['totalReports', String(r.totalReports)],
      ['totalRetracted', String(r.totalRetracted)],
      ['totalDelisted', String(r.totalDelisted)],
    ],
    [r],
  );
  const known = Object.keys(labels).length;
  return (
    <>
      <div className="section-head">
        <span className="eyebrow">
          <Icon d={I.eye} size={14} /> Public vs private
        </span>
        <h2 className="t-h2">What the chain sees.</h2>
        <p className="lead">Everything on the left is public on Midnight. Nothing on the right ever leaves a bank.</p>
      </div>
      <div className="grid grid-2">
        <div className="window window--dark">
          <div className="window__bar">
            <div className="lights" aria-hidden="true"><i /><i /><i /></div>
            <span className="window__title">Public ledger · {short(state.contractAddress, 6)}</span>
          </div>
          <pre className="ledger">
            {lines.map(([k, v]) => (
              <div key={k}>
                <span className="k">{k}</span> <span className="v">{v}</span>
              </div>
            ))}
          </pre>
        </div>
        <div className="card privacy">
          <ul className="checklist">
            <li><span><strong>Account numbers.</strong> Only tags keyed with the consortium key are public. Without the key, a tag can't be linked to any account.</span></li>
            <li><span><strong>Which bank reported.</strong> Reports prove membership in the licensed-bank Merkle tree without revealing the leaf.</span></li>
            <li><span><strong>Evidence.</strong> Only a salted commitment is stored; the bank can open it to a regulator later.</span></li>
            <li><span><strong>Who checks whom.</strong> Payee checks read public state locally. They create no transaction and leave no trace.</span></li>
            <li><span><strong>Secrets.</strong> Bank secrets, the consortium key and the regulator key stay in each party's private state.</span></li>
          </ul>
          {known > 0 && <p className="t-micro">This browser can label {known} tag(s) because you typed those accounts here.</p>}
        </div>
      </div>
    </>
  );
}

function Proofs({ state }: { state: State }) {
  return (
    <>
      <div className="section-head section-head--left">
        <span className="eyebrow">
          <Icon d={I.check} size={14} /> Proofs on {state.network}
        </span>
        <h2 className="t-h3">Every action is a real zero-knowledge transaction.</h2>
        <p className="t-small">
          The operator column is this demo's own record. On-chain, a report carries no bank identity.
        </p>
      </div>
      <div className="card card--raised txcard">
        <table className="tbl">
          <thead>
            <tr><th>Step</th><th>Circuit</th><th>Operator</th><th>Tx hash</th><th>Block</th></tr>
          </thead>
          <tbody>
            {state.transactions.map((t, i) => (
              <tr key={i}>
                <td>{t.step}</td>
                <td className="t-mono">{t.circuit}</td>
                <td>{t.actor}</td>
                <td className="t-mono" title={t.txHash}>{short(t.txHash, 8)}</td>
                <td className="t-mono">{t.blockHeight ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {state.rejectedAttempts.length > 0 && (
        <div className="grid grid-3 rejects">
          {state.rejectedAttempts.map((r, i) => (
            <div className="tile" key={i}>
              <span className="icon-tile"><Icon d={I.x} /></span>
              <div>
                <p className="t-title">{r.step}</p>
                <p>Rejected by the contract: {r.expected}.</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
