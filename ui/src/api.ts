// Client for the MuleNet service (cli/src/server.ts). Falls back to the
// recorded deployment receipt when no service is running (read-only mode).

export type TxReceipt = {
  step: string;
  actor: string;
  circuit: string;
  txHash: string;
  txId?: string;
  blockHeight?: number;
  at: string;
};

export type Rejection = { step: string; actor: string; expected: string; error: string };

export type Registry = {
  contractAddress: string;
  threshold: number;
  activeBanks: number;
  bankTreeRoot: string;
  totalReports: number;
  totalRetracted: number;
  totalDelisted: number;
  flagged: string[];
  reportCounts: { tag: string; count: number; round: number; flagged: boolean }[];
  nullifiers: number;
  evidenceCommitments: number;
};

export type State = {
  network: string;
  contractAddress: string;
  banks: { name: string; active: boolean }[];
  registry: Registry;
  transactions: TxReceipt[];
  rejectedAttempts: Rejection[];
  live: boolean;
};

export type Check = { account: string; tag: string; flagged: boolean; reports: number; threshold: number };
export type Evidence = { tag: string; evidenceHash: string; salt: string };

const json = async <T>(res: Response): Promise<T> => {
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error ?? res.statusText);
  return data as T;
};

const post = <T>(path: string, body: unknown) =>
  fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(
    (r) => json<T>(r),
  );

export const getState = async (): Promise<State> => {
  try {
    return { ...(await json<Omit<State, 'live'>>(await fetch('/api/state'))), live: true };
  } catch {
    // Read-only mode: the receipt from the last recorded run.
    const d = await json<{
      network: string;
      contractAddress: string;
      banks: string[];
      transactions: TxReceipt[];
      rejectedAttempts: Rejection[];
      finalState: Registry;
    }>(await fetch('/deployment.json'));
    const revoked = new Set(d.transactions.filter((t) => t.circuit === 'revokeBank').map((t) => t.step.replace(/^Regulator revokes /, '')));
    return {
      network: d.network,
      contractAddress: d.contractAddress,
      banks: d.banks.map((name) => ({ name, active: !revoked.has(name) })),
      registry: d.finalState,
      transactions: d.transactions,
      rejectedAttempts: d.rejectedAttempts,
      live: false,
    };
  }
};

export const check = (account: string) => fetch(`/api/check?account=${encodeURIComponent(account)}`).then((r) => json<Check>(r));
export const evidence = (bank: string) => fetch(`/api/evidence?bank=${encodeURIComponent(bank)}`).then((r) => json<Evidence[]>(r));
export const report = (bank: string, account: string, evidence: string) => post<TxReceipt>('/api/report', { bank, account, evidence });
export const retract = (bank: string, account: string) => post<TxReceipt>('/api/retract', { bank, account });
export const delist = (account: string) => post<TxReceipt>('/api/delist', { account });

export const short = (hex: string, n = 6) => (hex.length > 2 * n + 1 ? `${hex.slice(0, n)}…${hex.slice(-n)}` : hex);
