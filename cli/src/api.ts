// MuleNet API over midnight-js: deploy, join as an actor, call circuits, read the registry.
// SPDX-License-Identifier: Apache-2.0

import { deployContract, findDeployedContract, type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { type Logger } from 'pino';
import {
  CompiledMuleNetContract,
  type Contract,
  type Ledger,
  type MuleNetPrivateState,
  type Witnesses,
  createBankPrivateState,
  createRegulatorPrivateState,
  ledger,
  pureCircuits,
} from '../../contract/src/index.js';

export type MuleNetContract = Contract<MuleNetPrivateState, Witnesses<MuleNetPrivateState>>;
export type MuleNetCircuit = Exclude<keyof MuleNetContract['impureCircuits'], number | symbol>;
export type MuleNetProviders = MidnightProviders<MuleNetCircuit, string, MuleNetPrivateState>;
export type ActorHandle = FoundContract<MuleNetContract>;

export const CIRCUITS: MuleNetCircuit[] = ['registerBank', 'revokeBank', 'delist', 'reportMule', 'retractReport'];

/** One on-chain transaction, as recorded in the deployment receipt. */
export type TxReceipt = {
  readonly step: string;
  readonly actor: string;
  readonly circuit: MuleNetCircuit | 'deploy';
  readonly txHash: string;
  readonly txId?: string;
  readonly blockHeight?: number;
  readonly at: string;
};

/** Encodes an account identifier ("IFSC:account", IBAN, ...) as 32 bytes. Normalises case and spaces. */
export const encodeAccountId = (s: string): Uint8Array => {
  const normalised = s.replace(/\s+/g, '').toUpperCase();
  const bytes = new TextEncoder().encode(normalised);
  if (bytes.length > 32) throw new Error('account identifier longer than 32 bytes');
  const out = new Uint8Array(32);
  out.set(bytes);
  return out;
};

/** SHA-256 of an evidence document; only this digest ever enters a circuit. */
export const hashEvidence = async (evidence: string): Promise<Uint8Array> =>
  new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(evidence)));

export const randomBytes = (n = 32): Uint8Array => {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
};

export const actorStateId = (actor: string) => `mulenet:${actor}`;

/** Snapshot of the public registry, in a JSON-friendly shape. */
export type RegistrySnapshot = {
  readonly contractAddress: ContractAddress;
  readonly threshold: number;
  readonly activeBanks: number;
  readonly bankTreeRoot: string;
  readonly totalReports: number;
  readonly totalRetracted: number;
  readonly totalDelisted: number;
  readonly flagged: string[];
  readonly reportCounts: { tag: string; count: number; round: number; flagged: boolean }[];
  readonly nullifiers: number;
  readonly evidenceCommitments: number;
};

export const snapshot = (contractAddress: ContractAddress, l: Ledger): RegistrySnapshot => {
  const flagged = [...l.flagged].map(toHex);
  const flaggedSet = new Set(flagged);
  return {
    contractAddress,
    threshold: Number(l.threshold),
    activeBanks: Number(l.activeBanks),
    bankTreeRoot: l.banks.root().field.toString(16),
    totalReports: Number(l.totalReports),
    totalRetracted: Number(l.totalRetracted),
    totalDelisted: Number(l.totalDelisted),
    flagged,
    reportCounts: [...l.reportCount].map(([tag, count]) => ({
      tag: toHex(tag),
      count: Number(count),
      round: l.reportRound.member(tag) ? Number(l.reportRound.lookup(tag)) : 0,
      flagged: flaggedSet.has(toHex(tag)),
    })),
    nullifiers: Number(l.nullifiers.size()),
    evidenceCommitments: Number(l.evidenceCommitments.size()),
  };
};

export class MuleNetAPI {
  readonly receipts: TxReceipt[] = [];
  private readonly handles = new Map<string, ActorHandle>();

  private constructor(
    readonly providers: MuleNetProviders,
    readonly contractAddress: ContractAddress,
    readonly consortiumKey: Uint8Array,
    private readonly logger?: Logger,
  ) {
    providers.privateStateProvider.setContractAddress(contractAddress);
  }

  /** Deploys a fresh registry; the deployer becomes the regulator. */
  static async deploy(
    providers: MuleNetProviders,
    opts: { threshold: number; consortiumKey?: Uint8Array; regulatorSecret?: Uint8Array },
    logger?: Logger,
  ): Promise<MuleNetAPI> {
    const consortiumKey = opts.consortiumKey ?? randomBytes();
    const regulatorState = createRegulatorPrivateState(consortiumKey, opts.regulatorSecret ?? randomBytes());
    logger?.info(`Deploying MuleNet (threshold ${opts.threshold})...`);
    const deployed = await deployContract(providers, {
      compiledContract: CompiledMuleNetContract,
      privateStateId: actorStateId('regulator'),
      initialPrivateState: regulatorState,
      args: [BigInt(opts.threshold)],
    });
    const address = deployed.deployTxData.public.contractAddress;
    const api = new MuleNetAPI(providers, address, consortiumKey, logger);
    api.handles.set('regulator', deployed);
    api.record('Deploy registry', 'regulator', 'deploy', deployed.deployTxData.public);
    logger?.info(`Deployed at ${address}`);
    return api;
  }

  /** Connects to an existing registry. Actors are added with {@link addRegulator}/{@link addBank}. */
  static async connect(
    providers: MuleNetProviders,
    contractAddress: ContractAddress,
    consortiumKey: Uint8Array,
    logger?: Logger,
  ): Promise<MuleNetAPI> {
    return new MuleNetAPI(providers, contractAddress, consortiumKey, logger);
  }

  private async join(actor: string, initialPrivateState: MuleNetPrivateState): Promise<ActorHandle> {
    const existing = this.handles.get(actor);
    if (existing) return existing;
    const handle = await findDeployedContract(this.providers, {
      contractAddress: this.contractAddress,
      compiledContract: CompiledMuleNetContract,
      privateStateId: actorStateId(actor),
      initialPrivateState,
    });
    this.handles.set(actor, handle);
    return handle;
  }

  addRegulator(regulatorSecret: Uint8Array) {
    return this.join('regulator', createRegulatorPrivateState(this.consortiumKey, regulatorSecret));
  }

  /** Adds a bank actor locally and returns its public Merkle leaf (to be registered by the regulator). */
  async addBank(name: string, bankSecret: Uint8Array = randomBytes()): Promise<Uint8Array> {
    await this.join(name, createBankPrivateState(this.consortiumKey, bankSecret));
    return pureCircuits.bankLeaf(bankSecret);
  }

  private handle(actor: string): ActorHandle {
    const h = this.handles.get(actor);
    if (!h) throw new Error(`Unknown actor '${actor}'`);
    return h;
  }

  private record(
    step: string,
    actor: string,
    circuit: TxReceipt['circuit'],
    pub: { txHash: string; txId?: unknown; blockHeight?: number },
  ): TxReceipt {
    const r: TxReceipt = {
      step,
      actor,
      circuit,
      txHash: pub.txHash,
      txId: pub.txId === undefined ? undefined : String(pub.txId),
      blockHeight: pub.blockHeight,
      at: new Date().toISOString(),
    };
    this.receipts.push(r);
    this.logger?.info(`✔ ${step} — ${circuit} by ${actor} — tx ${r.txHash}${r.blockHeight ? ` @ block ${r.blockHeight}` : ''}`);
    return r;
  }

  async registerBank(leaf: Uint8Array, step = 'Register bank'): Promise<TxReceipt> {
    const tx = await this.handle('regulator').callTx.registerBank(leaf);
    return this.record(step, 'regulator', 'registerBank', tx.public);
  }

  async revokeBank(index: bigint, step = 'Revoke bank'): Promise<TxReceipt> {
    const tx = await this.handle('regulator').callTx.revokeBank(index);
    return this.record(step, 'regulator', 'revokeBank', tx.public);
  }

  async delist(account: string, step = 'Delist account'): Promise<TxReceipt> {
    const tx = await this.handle('regulator').callTx.delist(this.tagOf(account));
    return this.record(step, 'regulator', 'delist', tx.public);
  }

  async report(bank: string, account: string, evidence: string, step = 'Report mule'): Promise<TxReceipt> {
    const tx = await this.handle(bank).callTx.reportMule(encodeAccountId(account), await hashEvidence(evidence));
    return this.record(step, bank, 'reportMule', tx.public);
  }

  async retract(bank: string, account: string, step = 'Retract report'): Promise<TxReceipt> {
    const tx = await this.handle(bank).callTx.retractReport(encodeAccountId(account));
    return this.record(step, bank, 'retractReport', tx.public);
  }

  // ------------------------------------------------ off-chain reads --

  tagOf(account: string): Uint8Array {
    return pureCircuits.accountTag(this.consortiumKey, encodeAccountId(account));
  }

  async ledger(): Promise<Ledger> {
    const state = await this.providers.publicDataProvider.queryContractState(this.contractAddress);
    if (!state) throw new Error(`No MuleNet contract at ${this.contractAddress}`);
    return ledger(state.data);
  }

  /** Pre-payment check: reads public state only, so it creates no transaction. */
  async check(account: string): Promise<{ account: string; tag: string; flagged: boolean; reports: number; threshold: number }> {
    const l = await this.ledger();
    const tag = this.tagOf(account);
    return {
      account,
      tag: toHex(tag),
      flagged: l.flagged.member(tag),
      reports: l.reportCount.member(tag) ? Number(l.reportCount.lookup(tag)) : 0,
      threshold: Number(l.threshold),
    };
  }

  async snapshot(): Promise<RegistrySnapshot> {
    return snapshot(this.contractAddress, await this.ledger());
  }

  async evidenceLog(bank: string) {
    const ps = await this.providers.privateStateProvider.get(actorStateId(bank));
    return (ps?.evidenceLog ?? []).map((e) => ({ tag: toHex(e.tag), evidenceHash: toHex(e.evidenceHash), salt: toHex(e.salt) }));
  }
}
