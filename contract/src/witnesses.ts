// MuleNet witnesses: everything the contract needs that must never go on-chain.
// SPDX-License-Identifier: Apache-2.0

import { type Ledger } from './managed/mulenet/contract/index.js';
import { type WitnessContext } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';

/** A report this bank filed, kept locally so it can later be opened to a regulator. */
export type EvidenceRecord = {
  readonly tag: Uint8Array;
  readonly evidenceHash: Uint8Array;
  readonly salt: Uint8Array;
};

/**
 * Private state lives only in the operator's own private-state store.
 * A bank holds `bankSecret`; the regulator holds `regulatorSecret`.
 * Every consortium member holds the shared `consortiumKey`.
 */
export type MuleNetPrivateState = {
  readonly consortiumKey: Uint8Array;
  readonly bankSecret?: Uint8Array;
  readonly regulatorSecret?: Uint8Array;
  readonly evidenceLog: readonly EvidenceRecord[];
};

export const createBankPrivateState = (consortiumKey: Uint8Array, bankSecret: Uint8Array): MuleNetPrivateState => ({
  consortiumKey,
  bankSecret,
  evidenceLog: [],
});

export const createRegulatorPrivateState = (
  consortiumKey: Uint8Array,
  regulatorSecret: Uint8Array,
): MuleNetPrivateState => ({
  consortiumKey,
  regulatorSecret,
  evidenceLog: [],
});

// A missing secret is replaced by zeros, so the circuit's own assertion
// rejects the call with a readable message instead of the witness throwing.
const EMPTY = new Uint8Array(32);

/** Must match `HistoricMerkleTree<10, ...>` in mulenet.compact. */
export const TREE_DEPTH = 10;

const randomBytes = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
};

type Ctx = WitnessContext<Ledger, MuleNetPrivateState>;

export const witnesses = {
  regulatorSecret: ({ privateState }: Ctx): [MuleNetPrivateState, Uint8Array] => [
    privateState,
    privateState.regulatorSecret ?? EMPTY,
  ],

  bankSecret: ({ privateState }: Ctx): [MuleNetPrivateState, Uint8Array] => [
    privateState,
    privateState.bankSecret ?? EMPTY,
  ],

  consortiumKey: ({ privateState }: Ctx): [MuleNetPrivateState, Uint8Array] => [
    privateState,
    privateState.consortiumKey,
  ],

  // Looks the bank's leaf up in the public tree. An unregistered bank gets a
  // path for an empty leaf, which the circuit rejects.
  bankMembershipPath: ({ privateState, ledger }: Ctx, leaf: Uint8Array) => {
    const path = ledger.banks.findPathForLeaf(leaf) ?? {
      leaf: EMPTY,
      path: Array.from({ length: TREE_DEPTH }, () => ({ sibling: { field: 0n }, goes_left: false })),
    };
    return [privateState, path] as [MuleNetPrivateState, typeof path];
  },

  evidenceSalt: ({ privateState }: Ctx, tag: Uint8Array, evidenceHash: Uint8Array): [MuleNetPrivateState, Uint8Array] => {
    const salt = randomBytes(32);
    return [{ ...privateState, evidenceLog: [...privateState.evidenceLog, { tag, evidenceHash, salt }] }, salt];
  },
};
