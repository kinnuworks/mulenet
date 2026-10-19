// Multi-party test bed: one public ledger, many actors with separate private state.
// SPDX-License-Identifier: Apache-2.0

import {
  type CircuitContext,
  type CircuitResults,
  QueryContext,
  sampleContractAddress,
  createConstructorContext,
  CostModel,
} from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { Contract, type Ledger, ledger, pureCircuits } from '../managed/mulenet/contract/index.js';
import {
  type MuleNetPrivateState,
  createBankPrivateState,
  createRegulatorPrivateState,
  witnesses,
} from '../witnesses.js';

export const randomBytes = (length = 32): Uint8Array => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
};

/** Encodes an account identifier (e.g. "SBIN0001234:00011122233") as 32 bytes. */
export const accountId = (s: string): Uint8Array => {
  const out = new Uint8Array(32);
  out.set(new TextEncoder().encode(s).slice(0, 32));
  return out;
};

export const REGULATOR = 'regulator';

export class MuleNetSimulator {
  readonly contract = new Contract<MuleNetPrivateState>(witnesses);
  readonly consortiumKey: Uint8Array;
  readonly privateStates = new Map<string, MuleNetPrivateState>();
  context: CircuitContext<MuleNetPrivateState>;

  constructor(threshold: bigint, consortiumKey = randomBytes()) {
    this.consortiumKey = consortiumKey;
    const regulatorState = createRegulatorPrivateState(consortiumKey, randomBytes());
    const { currentPrivateState, currentContractState, currentZswapLocalState } = this.contract.initialState(
      createConstructorContext(regulatorState, '0'.repeat(64)),
      threshold,
    );
    this.privateStates.set(REGULATOR, currentPrivateState);
    this.context = {
      currentPrivateState,
      currentZswapLocalState,
      costModel: CostModel.initialCostModel(),
      currentQueryContext: new QueryContext(currentContractState.data, sampleContractAddress()),
    };
  }

  get ledger(): Ledger {
    return ledger(this.context.currentQueryContext.state);
  }

  privateState(actor: string): MuleNetPrivateState {
    const ps = this.privateStates.get(actor);
    if (!ps) throw new Error(`unknown actor ${actor}`);
    return ps;
  }

  /** Creates a bank's private state (not yet registered on-chain). */
  addBank(name: string, secret = randomBytes(), consortiumKey = this.consortiumKey): Uint8Array {
    this.privateStates.set(name, createBankPrivateState(consortiumKey, secret));
    return pureCircuits.bankLeaf(secret);
  }

  /** Adds an actor with arbitrary private state, for adversarial tests. */
  addActor(name: string, state: MuleNetPrivateState): void {
    this.privateStates.set(name, state);
  }

  /** Public transcript of the last successful transaction: what the chain would see. */
  lastPublicTranscript: unknown[] = [];

  /** Runs `fn` as `actor`, persisting that actor's private state only if the call succeeds. */
  private as<T>(
    actor: string,
    fn: (ctx: CircuitContext<MuleNetPrivateState>) => CircuitResults<MuleNetPrivateState, T>,
  ): T {
    const ctx = { ...this.context, currentPrivateState: this.privateState(actor) };
    const { context, result, proofData } = fn(ctx);
    this.context = context;
    this.privateStates.set(actor, context.currentPrivateState);
    this.lastPublicTranscript = proofData.publicTranscript;
    return result;
  }

  registerBank(leaf: Uint8Array, actor = REGULATOR): void {
    this.as(actor, (c) => this.contract.impureCircuits.registerBank(c, leaf));
  }

  revokeBank(index: bigint, actor = REGULATOR): void {
    this.as(actor, (c) => this.contract.impureCircuits.revokeBank(c, index));
  }

  delist(tag: Uint8Array, actor = REGULATOR): void {
    this.as(actor, (c) => this.contract.impureCircuits.delist(c, tag));
  }

  report(bank: string, account: Uint8Array, evidenceHash = randomBytes()): void {
    this.as(bank, (c) => this.contract.impureCircuits.reportMule(c, account, evidenceHash));
  }

  retract(bank: string, account: Uint8Array): void {
    this.as(bank, (c) => this.contract.impureCircuits.retractReport(c, account));
  }

  // ---- off-chain lookups: these never create a transaction ----

  tag(account: Uint8Array): Uint8Array {
    return pureCircuits.accountTag(this.consortiumKey, account);
  }

  isFlagged(account: Uint8Array): boolean {
    return this.ledger.flagged.member(this.tag(account));
  }

  reports(account: Uint8Array): bigint {
    const t = this.tag(account);
    return this.ledger.reportCount.member(t) ? this.ledger.reportCount.lookup(t) : 0n;
  }

  round(account: Uint8Array): bigint {
    const t = this.tag(account);
    return this.ledger.reportRound.member(t) ? this.ledger.reportRound.lookup(t) : 0n;
  }
}
