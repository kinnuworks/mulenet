// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach } from 'vitest';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { pureCircuits } from '../managed/mulenet/contract/index.js';
import { createBankPrivateState, type MuleNetPrivateState } from '../witnesses.js';
import { MuleNetSimulator, REGULATOR, accountId, randomBytes } from './mulenet-simulator.js';

setNetworkId('undeployed');

const MULE = accountId('SBIN0001234:00011122233');
const MULE_2 = accountId('HDFC0004321:50100099988');
const INNOCENT = accountId('ICIC0000777:000401500123');

const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');
const eq = (a: Uint8Array, b: Uint8Array) => hex(a) === hex(b);

/** Hex of the value with trailing zero bytes dropped (how aligned values may encode it). */
const needle = (b: Uint8Array) => {
  let end = b.length;
  while (end > 0 && b[end - 1] === 0) end--;
  return hex(b.slice(0, end));
};

/** Serialises anything (Uint8Arrays as hex, bigints as decimal) for substring search. */
const dump = (v: unknown): string =>
  JSON.stringify(v, (_k, x) => {
    if (x instanceof Uint8Array) return hex(x);
    if (typeof x === 'bigint') return x.toString();
    if (x instanceof Map) return [...x.entries()];
    return x;
  });

/** Collects every public value currently on the ledger. */
const ledgerDump = (sim: MuleNetSimulator): string => {
  const l = sim.ledger;
  return dump({
    regulator: l.regulator,
    consortiumKeyCommitment: l.consortiumKeyCommitment,
    nullifiers: [...l.nullifiers],
    reportCount: [...l.reportCount],
    reportRound: [...l.reportRound],
    flagged: [...l.flagged],
    evidence: [...l.evidenceCommitments],
  });
};

/** A consortium with a regulator, threshold 3 and banks A..E registered. */
const consortium = (threshold = 3n, banks = ['A', 'B', 'C', 'D', 'E']) => {
  const sim = new MuleNetSimulator(threshold);
  const leaves: Record<string, Uint8Array> = {};
  for (const b of banks) {
    leaves[b] = sim.addBank(b);
    sim.registerBank(leaves[b]);
  }
  return { sim, leaves };
};

// =====================================================================
describe('deployment', () => {
  it('stores the threshold', () => {
    expect(new MuleNetSimulator(3n).ledger.threshold).toBe(3n);
  });

  it('accepts a threshold of 1', () => {
    expect(new MuleNetSimulator(1n).ledger.threshold).toBe(1n);
  });

  it('accepts the maximum threshold 255', () => {
    expect(new MuleNetSimulator(255n).ledger.threshold).toBe(255n);
  });

  it('rejects a threshold of 0', () => {
    expect(() => new MuleNetSimulator(0n)).toThrow('threshold must be at least 1');
  });

  it('publishes the regulator public key, not the secret', () => {
    const sim = new MuleNetSimulator(3n);
    const secret = sim.privateState(REGULATOR).regulatorSecret!;
    expect(eq(sim.ledger.regulator, pureCircuits.regulatorKey(secret))).toBe(true);
    expect(eq(sim.ledger.regulator, secret)).toBe(false);
  });

  it('publishes a commitment to the consortium key, not the key', () => {
    const sim = new MuleNetSimulator(3n);
    expect(eq(sim.ledger.consortiumKeyCommitment, pureCircuits.consortiumKeyCommit(sim.consortiumKey))).toBe(true);
    expect(ledgerDump(sim)).not.toContain(needle(sim.consortiumKey));
  });

  it('starts with an empty registry', () => {
    const l = new MuleNetSimulator(3n).ledger;
    expect(l.activeBanks).toBe(0n);
    expect(l.nullifiers.isEmpty()).toBe(true);
    expect(l.reportCount.isEmpty()).toBe(true);
    expect(l.flagged.isEmpty()).toBe(true);
    expect(l.evidenceCommitments.isEmpty()).toBe(true);
    expect(l.totalReports).toBe(0n);
    expect(l.totalRetracted).toBe(0n);
    expect(l.totalDelisted).toBe(0n);
  });

  it('is deterministic for the same regulator and consortium key', () => {
    const key = randomBytes();
    const a = new MuleNetSimulator(2n, key);
    const b = new MuleNetSimulator(2n, key);
    expect(eq(a.ledger.consortiumKeyCommitment, b.ledger.consortiumKeyCommitment)).toBe(true);
  });
});

// =====================================================================
describe('derivations', () => {
  const ck = randomBytes();

  it('account tags are deterministic', () => {
    expect(eq(pureCircuits.accountTag(ck, MULE), pureCircuits.accountTag(ck, MULE))).toBe(true);
  });

  it('different accounts get different tags', () => {
    expect(eq(pureCircuits.accountTag(ck, MULE), pureCircuits.accountTag(ck, MULE_2))).toBe(false);
  });

  it('a different consortium key gives a different tag for the same account', () => {
    expect(eq(pureCircuits.accountTag(ck, MULE), pureCircuits.accountTag(randomBytes(), MULE))).toBe(false);
  });

  it('a tag does not contain the account bytes', () => {
    expect(hex(pureCircuits.accountTag(ck, MULE))).not.toContain(needle(MULE));
  });

  it('nullifiers differ per bank for the same account', () => {
    const tag = pureCircuits.accountTag(ck, MULE);
    expect(eq(pureCircuits.reportNullifier(randomBytes(), tag, 0n), pureCircuits.reportNullifier(randomBytes(), tag, 0n))).toBe(false);
  });

  it('nullifiers differ per account for the same bank', () => {
    const sk = randomBytes();
    expect(
      eq(
        pureCircuits.reportNullifier(sk, pureCircuits.accountTag(ck, MULE), 0n),
        pureCircuits.reportNullifier(sk, pureCircuits.accountTag(ck, MULE_2), 0n),
      ),
    ).toBe(false);
  });

  it('nullifiers differ per appeal round', () => {
    const sk = randomBytes();
    const tag = pureCircuits.accountTag(ck, MULE);
    expect(eq(pureCircuits.reportNullifier(sk, tag, 0n), pureCircuits.reportNullifier(sk, tag, 1n))).toBe(false);
  });

  it('nullifiers are deterministic', () => {
    const sk = randomBytes();
    const tag = pureCircuits.accountTag(ck, MULE);
    expect(eq(pureCircuits.reportNullifier(sk, tag, 4n), pureCircuits.reportNullifier(sk, tag, 4n))).toBe(true);
  });

  it('every derivation is domain-separated', () => {
    const x = randomBytes();
    const outputs = [
      pureCircuits.regulatorKey(x),
      pureCircuits.bankLeaf(x),
      pureCircuits.consortiumKeyCommit(x),
      pureCircuits.accountTag(x, x),
    ].map(hex);
    expect(new Set(outputs).size).toBe(outputs.length);
  });

  it('a bank leaf does not reveal the bank secret', () => {
    const sk = randomBytes();
    expect(hex(pureCircuits.bankLeaf(sk))).not.toContain(needle(sk));
  });
});

// =====================================================================
describe('bank registry', () => {
  it('the regulator can register a bank', () => {
    const sim = new MuleNetSimulator(3n);
    sim.registerBank(sim.addBank('A'));
    expect(sim.ledger.activeBanks).toBe(1n);
  });

  it('registered banks appear in the Merkle tree', () => {
    const { sim, leaves } = consortium();
    for (const leaf of Object.values(leaves)) {
      expect(sim.ledger.banks.findPathForLeaf(leaf)).toBeDefined();
    }
  });

  it('counts active banks', () => {
    expect(consortium().sim.ledger.activeBanks).toBe(5n);
  });

  it('a bank cannot register another bank', () => {
    const { sim } = consortium();
    expect(() => sim.registerBank(randomBytes(), 'A')).toThrow('caller is not the regulator');
  });

  it('a stranger cannot register itself', () => {
    const sim = new MuleNetSimulator(3n);
    const leaf = sim.addBank('X');
    expect(() => sim.registerBank(leaf, 'X')).toThrow('caller is not the regulator');
    expect(sim.ledger.activeBanks).toBe(0n);
  });

  it('a different regulator secret is rejected', () => {
    const sim = new MuleNetSimulator(3n);
    sim.addActor('fake-regulator', { consortiumKey: sim.consortiumKey, regulatorSecret: randomBytes(), evidenceLog: [] });
    expect(() => sim.registerBank(randomBytes(), 'fake-regulator')).toThrow('caller is not the regulator');
  });

  it('a failed registration leaves the ledger unchanged', () => {
    const { sim } = consortium();
    const before = ledgerDump(sim);
    expect(() => sim.registerBank(randomBytes(), 'B')).toThrow();
    expect(ledgerDump(sim)).toBe(before);
  });
});

// =====================================================================
describe('reporting', () => {
  let sim: MuleNetSimulator;
  beforeEach(() => {
    sim = consortium().sim;
  });

  it('a licensed bank can report an account', () => {
    sim.report('A', MULE);
    expect(sim.reports(MULE)).toBe(1n);
  });

  it('one report does not flag the account', () => {
    sim.report('A', MULE);
    expect(sim.isFlagged(MULE)).toBe(false);
  });

  it('two reports do not flag the account under threshold 3', () => {
    sim.report('A', MULE);
    sim.report('B', MULE);
    expect(sim.isFlagged(MULE)).toBe(false);
  });

  it('the third independent report flags the account', () => {
    sim.report('A', MULE);
    sim.report('B', MULE);
    sim.report('C', MULE);
    expect(sim.isFlagged(MULE)).toBe(true);
  });

  it('further reports keep the account flagged and keep counting', () => {
    for (const b of ['A', 'B', 'C', 'D', 'E']) sim.report(b, MULE);
    expect(sim.isFlagged(MULE)).toBe(true);
    expect(sim.reports(MULE)).toBe(5n);
  });

  it('threshold 1 flags on the first report', () => {
    const s = consortium(1n).sim;
    s.report('A', MULE);
    expect(s.isFlagged(MULE)).toBe(true);
  });

  it('accounts are tracked independently', () => {
    for (const b of ['A', 'B', 'C']) sim.report(b, MULE);
    sim.report('A', MULE_2);
    expect(sim.isFlagged(MULE)).toBe(true);
    expect(sim.isFlagged(MULE_2)).toBe(false);
    expect(sim.reports(MULE_2)).toBe(1n);
  });

  it('an unreported account is not flagged and has no count', () => {
    sim.report('A', MULE);
    expect(sim.isFlagged(INNOCENT)).toBe(false);
    expect(sim.reports(INNOCENT)).toBe(0n);
  });

  it('one bank can report many different accounts', () => {
    sim.report('A', MULE);
    sim.report('A', MULE_2);
    sim.report('A', INNOCENT);
    expect(sim.ledger.reportCount.size()).toBe(3n);
  });

  it('each report adds exactly one nullifier', () => {
    sim.report('A', MULE);
    sim.report('B', MULE);
    expect(sim.ledger.nullifiers.size()).toBe(2n);
  });

  it('each report adds exactly one evidence commitment', () => {
    sim.report('A', MULE);
    sim.report('B', MULE_2);
    expect(sim.ledger.evidenceCommitments.size()).toBe(2n);
  });

  it('counts total reports', () => {
    sim.report('A', MULE);
    sim.report('B', MULE);
    sim.report('A', MULE_2);
    expect(sim.ledger.totalReports).toBe(3n);
  });

  it('the reporting bank keeps the evidence opening locally', () => {
    const evidence = randomBytes();
    sim.report('A', MULE, evidence);
    const log = sim.privateState('A').evidenceLog;
    expect(log).toHaveLength(1);
    expect(eq(log[0].evidenceHash, evidence)).toBe(true);
    expect(eq(log[0].tag, sim.tag(MULE))).toBe(true);
  });

  it('other banks do not receive the evidence opening', () => {
    sim.report('A', MULE);
    expect(sim.privateState('B').evidenceLog).toHaveLength(0);
    expect(sim.privateState(REGULATOR).evidenceLog).toHaveLength(0);
  });

  it('the evidence commitment opens with the locally stored salt', () => {
    sim.report('A', MULE, randomBytes());
    const { tag, evidenceHash, salt } = sim.privateState('A').evidenceLog[0];
    expect(sim.ledger.evidenceCommitments.member(pureCircuits.evidenceCommit(tag, evidenceHash, salt))).toBe(true);
  });

  it('a wrong opening does not match any commitment', () => {
    sim.report('A', MULE, randomBytes());
    const { tag, salt } = sim.privateState('A').evidenceLog[0];
    expect(sim.ledger.evidenceCommitments.member(pureCircuits.evidenceCommit(tag, randomBytes(), salt))).toBe(false);
  });

  it('the same evidence twice yields different commitments (salted)', () => {
    const evidence = randomBytes();
    sim.report('A', MULE, evidence);
    sim.report('B', MULE, evidence);
    const [c1, c2] = [...sim.ledger.evidenceCommitments];
    expect(eq(c1, c2)).toBe(false);
  });

  it('the regulator can also be a reporting bank only if registered as one', () => {
    expect(() => sim.report(REGULATOR, MULE)).toThrow('membership path is for a different bank');
  });
});

// =====================================================================
describe('attacks on reporting', () => {
  let sim: MuleNetSimulator;
  let leaves: Record<string, Uint8Array>;
  beforeEach(() => {
    ({ sim, leaves } = consortium());
  });

  it('a bank cannot report the same account twice', () => {
    sim.report('A', MULE);
    expect(() => sim.report('A', MULE)).toThrow('already reported this account');
  });

  it('a double report does not change the count', () => {
    sim.report('A', MULE);
    expect(() => sim.report('A', MULE)).toThrow();
    expect(sim.reports(MULE)).toBe(1n);
  });

  it('one bank cannot flag an account alone by repeating', () => {
    sim.report('A', MULE);
    for (let i = 0; i < 3; i++) expect(() => sim.report('A', MULE)).toThrow();
    expect(sim.isFlagged(MULE)).toBe(false);
  });

  it('an unregistered bank cannot report', () => {
    sim.addBank('Rogue');
    expect(() => sim.report('Rogue', MULE)).toThrow('membership path is for a different bank');
  });

  it('a bank with the wrong consortium key cannot report', () => {
    const secret = randomBytes();
    sim.addBank('Leaky', secret, randomBytes());
    sim.registerBank(pureCircuits.bankLeaf(secret));
    expect(() => sim.report('Leaky', MULE)).toThrow('wrong consortium key');
  });

  it('an outsider who knows the consortium key but is not licensed cannot report', () => {
    sim.addBank('Insider-thief');
    expect(() => sim.report('Insider-thief', MULE)).toThrow('membership path is for a different bank');
  });

  it("a bank cannot use another bank's membership path", () => {
    sim.addActor('Impostor', createBankPrivateState(sim.consortiumKey, randomBytes()));
    const stolen = sim.ledger.banks.findPathForLeaf(leaves.A)!;
    const original = sim.contract.witnesses.bankMembershipPath;
    sim.contract.witnesses.bankMembershipPath = (ctx: Parameters<typeof original>[0]) =>
      [ctx.privateState, stolen] as ReturnType<typeof original>;
    try {
      expect(() => sim.report('Impostor', MULE)).toThrow('membership path is for a different bank');
    } finally {
      sim.contract.witnesses.bankMembershipPath = original;
    }
  });

  it('a forged path for an unregistered leaf is rejected by the root check', () => {
    const secret = randomBytes();
    sim.addActor('Forger', createBankPrivateState(sim.consortiumKey, secret));
    const forgedLeaf = pureCircuits.bankLeaf(secret);
    const original = sim.contract.witnesses.bankMembershipPath;
    sim.contract.witnesses.bankMembershipPath = (ctx: Parameters<typeof original>[0]) =>
      [
        ctx.privateState,
        { leaf: forgedLeaf, path: Array.from({ length: 10 }, () => ({ sibling: { field: 7n }, goes_left: true })) },
      ] as ReturnType<typeof original>;
    try {
      expect(() => sim.report('Forger', MULE)).toThrow('not a licensed bank');
    } finally {
      sim.contract.witnesses.bankMembershipPath = original;
    }
  });

  it('a missing bank secret cannot report', () => {
    sim.addActor('NoSecret', { consortiumKey: sim.consortiumKey, evidenceLog: [] });
    expect(() => sim.report('NoSecret', MULE)).toThrow();
  });

  it('a failed report leaves the ledger unchanged', () => {
    sim.report('A', MULE);
    const before = ledgerDump(sim);
    expect(() => sim.report('A', MULE)).toThrow();
    expect(ledgerDump(sim)).toBe(before);
  });

  it('a failed report does not touch the attacker evidence log', () => {
    sim.report('A', MULE);
    expect(() => sim.report('A', MULE)).toThrow();
    expect(sim.privateState('A').evidenceLog).toHaveLength(1);
  });
});

// =====================================================================
describe('retraction', () => {
  let sim: MuleNetSimulator;
  beforeEach(() => {
    sim = consortium().sim;
  });

  it('a bank can retract its own report', () => {
    sim.report('A', MULE);
    sim.retract('A', MULE);
    expect(sim.reports(MULE)).toBe(0n);
  });

  it('retracting removes the nullifier', () => {
    sim.report('A', MULE);
    sim.retract('A', MULE);
    expect(sim.ledger.nullifiers.size()).toBe(0n);
  });

  it('retracting below the threshold unflags the account', () => {
    for (const b of ['A', 'B', 'C']) sim.report(b, MULE);
    sim.retract('B', MULE);
    expect(sim.isFlagged(MULE)).toBe(false);
    expect(sim.reports(MULE)).toBe(2n);
  });

  it('retracting while still above the threshold keeps the flag', () => {
    for (const b of ['A', 'B', 'C', 'D']) sim.report(b, MULE);
    sim.retract('D', MULE);
    expect(sim.isFlagged(MULE)).toBe(true);
  });

  it('a bank can report again after retracting', () => {
    sim.report('A', MULE);
    sim.retract('A', MULE);
    sim.report('A', MULE);
    expect(sim.reports(MULE)).toBe(1n);
  });

  it("a bank cannot retract another bank's report", () => {
    sim.report('A', MULE);
    expect(() => sim.retract('B', MULE)).toThrow('no report from this bank to retract');
    expect(sim.reports(MULE)).toBe(1n);
  });

  it('a bank cannot retract twice', () => {
    sim.report('A', MULE);
    sim.retract('A', MULE);
    expect(() => sim.retract('A', MULE)).toThrow('no report from this bank to retract');
  });

  it('a bank cannot retract a report that never existed', () => {
    expect(() => sim.retract('A', MULE)).toThrow('no report from this bank to retract');
  });

  it('an unregistered bank cannot retract', () => {
    sim.report('A', MULE);
    sim.addBank('Rogue');
    expect(() => sim.retract('Rogue', MULE)).toThrow('membership path is for a different bank');
  });

  it('counts retractions', () => {
    sim.report('A', MULE);
    sim.report('B', MULE_2);
    sim.retract('A', MULE);
    sim.retract('B', MULE_2);
    expect(sim.ledger.totalRetracted).toBe(2n);
  });

  it('retraction does not reveal which report was retracted', () => {
    sim.report('A', MULE);
    sim.report('B', MULE);
    sim.retract('A', MULE);
    expect(sim.lastPublicTranscript.length).toBeGreaterThan(0);
    expect(dump(sim.lastPublicTranscript)).not.toContain(needle(pureCircuits.bankLeaf(sim.privateState('A').bankSecret!)));
  });
});

// =====================================================================
describe('appeals (delisting)', () => {
  let sim: MuleNetSimulator;
  beforeEach(() => {
    sim = consortium().sim;
    for (const b of ['A', 'B', 'C']) sim.report(b, MULE);
  });

  it('the regulator can delist a flagged account', () => {
    sim.delist(sim.tag(MULE));
    expect(sim.isFlagged(MULE)).toBe(false);
  });

  it('delisting resets the report count', () => {
    sim.delist(sim.tag(MULE));
    expect(sim.reports(MULE)).toBe(0n);
  });

  it('delisting opens a new round', () => {
    expect(sim.round(MULE)).toBe(0n);
    sim.delist(sim.tag(MULE));
    expect(sim.round(MULE)).toBe(1n);
  });

  it('banks can report again in the new round', () => {
    sim.delist(sim.tag(MULE));
    sim.report('A', MULE);
    expect(sim.reports(MULE)).toBe(1n);
  });

  it('a delisted account needs a fresh threshold to be flagged again', () => {
    sim.delist(sim.tag(MULE));
    sim.report('A', MULE);
    sim.report('B', MULE);
    expect(sim.isFlagged(MULE)).toBe(false);
    sim.report('C', MULE);
    expect(sim.isFlagged(MULE)).toBe(true);
  });

  it('a bank still cannot double report within the new round', () => {
    sim.delist(sim.tag(MULE));
    sim.report('A', MULE);
    expect(() => sim.report('A', MULE)).toThrow('already reported this account');
  });

  it('the regulator can delist an account that is reported but not yet flagged', () => {
    sim.report('A', MULE_2);
    sim.delist(sim.tag(MULE_2));
    expect(sim.reports(MULE_2)).toBe(0n);
  });

  it('multiple appeals increment the round each time', () => {
    sim.delist(sim.tag(MULE));
    sim.report('A', MULE);
    sim.delist(sim.tag(MULE));
    expect(sim.round(MULE)).toBe(2n);
  });

  it('cannot delist an account with no reports', () => {
    expect(() => sim.delist(sim.tag(INNOCENT))).toThrow('account has no reports');
  });

  it('cannot delist twice without new reports', () => {
    sim.delist(sim.tag(MULE));
    expect(() => sim.delist(sim.tag(MULE))).toThrow('account has no reports');
  });

  it('a bank cannot delist', () => {
    expect(() => sim.delist(sim.tag(MULE), 'A')).toThrow('caller is not the regulator');
    expect(sim.isFlagged(MULE)).toBe(true);
  });

  it('counts delistings', () => {
    sim.delist(sim.tag(MULE));
    expect(sim.ledger.totalDelisted).toBe(1n);
  });

  it('delisting leaves other accounts untouched', () => {
    for (const b of ['A', 'B', 'C']) sim.report(b, MULE_2);
    sim.delist(sim.tag(MULE));
    expect(sim.isFlagged(MULE_2)).toBe(true);
  });

  it("a retraction after delisting can't target the old round", () => {
    sim.delist(sim.tag(MULE));
    expect(() => sim.retract('A', MULE)).toThrow('no report from this bank to retract');
  });
});

// =====================================================================
describe('bank revocation', () => {
  let sim: MuleNetSimulator;
  beforeEach(() => {
    sim = consortium().sim;
  });

  it('the regulator can revoke a bank', () => {
    sim.revokeBank(1n);
    expect(sim.ledger.activeBanks).toBe(4n);
  });

  it('a revoked bank can no longer report', () => {
    sim.revokeBank(1n); // B
    expect(() => sim.report('B', MULE)).toThrow();
  });

  it('a revoked bank can no longer retract', () => {
    sim.report('B', MULE);
    sim.revokeBank(1n);
    expect(() => sim.retract('B', MULE)).toThrow();
  });

  it('other banks keep reporting after a revocation', () => {
    sim.revokeBank(1n);
    sim.report('A', MULE);
    sim.report('C', MULE);
    sim.report('D', MULE);
    expect(sim.isFlagged(MULE)).toBe(true);
  });

  it("a revoked bank cannot replay a path from before its revocation", () => {
    const oldPath = sim.ledger.banks.findPathForLeaf(pureCircuits.bankLeaf(sim.privateState('B').bankSecret!))!;
    sim.revokeBank(1n);
    const original = sim.contract.witnesses.bankMembershipPath;
    sim.contract.witnesses.bankMembershipPath = (ctx: Parameters<typeof original>[0]) =>
      [ctx.privateState, oldPath] as ReturnType<typeof original>;
    try {
      expect(() => sim.report('B', MULE)).toThrow('not a licensed bank');
    } finally {
      sim.contract.witnesses.bankMembershipPath = original;
    }
  });

  it('reports filed before revocation still count', () => {
    sim.report('B', MULE);
    sim.revokeBank(1n);
    expect(sim.reports(MULE)).toBe(1n);
  });

  it('a bank cannot revoke another bank', () => {
    expect(() => sim.revokeBank(0n, 'B')).toThrow('caller is not the regulator');
  });

  it('cannot revoke when no banks are active', () => {
    const empty = new MuleNetSimulator(3n);
    expect(() => empty.revokeBank(0n)).toThrow('no active banks');
  });

  it('a re-admitted bank can report again', () => {
    sim.revokeBank(1n);
    sim.registerBank(pureCircuits.bankLeaf(sim.privateState('B').bankSecret!));
    sim.report('B', MULE);
    expect(sim.reports(MULE)).toBe(1n);
  });
});

// =====================================================================
describe('privacy of the public ledger', () => {
  let sim: MuleNetSimulator;
  let leaves: Record<string, Uint8Array>;
  beforeEach(() => {
    ({ sim, leaves } = consortium());
    for (const b of ['A', 'B', 'C']) sim.report(b, MULE);
    sim.report('A', MULE_2);
  });

  it('no raw account identifier is stored', () => {
    const d = ledgerDump(sim);
    for (const acct of [MULE, MULE_2]) expect(d).not.toContain(needle(acct));
  });

  it('no bank secret is stored', () => {
    const d = ledgerDump(sim);
    for (const b of ['A', 'B', 'C']) expect(d).not.toContain(needle(sim.privateState(b).bankSecret!));
  });

  it('the consortium key is never stored', () => {
    expect(ledgerDump(sim)).not.toContain(needle(sim.consortiumKey));
  });

  it('the regulator secret is never stored', () => {
    expect(ledgerDump(sim)).not.toContain(needle(sim.privateState(REGULATOR).regulatorSecret!));
  });

  it('nullifiers are not bank leaves', () => {
    const leafSet = new Set(Object.values(leaves).map(hex));
    for (const n of sim.ledger.nullifiers) expect(leafSet.has(hex(n))).toBe(false);
  });

  it("one bank's nullifiers for two accounts are unlinkable", () => {
    const sk = sim.privateState('A').bankSecret!;
    const n1 = pureCircuits.reportNullifier(sk, sim.tag(MULE), 0n);
    const n2 = pureCircuits.reportNullifier(sk, sim.tag(MULE_2), 0n);
    expect(hex(n1).slice(0, 8)).not.toBe(hex(n2).slice(0, 8));
    expect(sim.ledger.nullifiers.member(n1) && sim.ledger.nullifiers.member(n2)).toBe(true);
  });

  it('evidence hashes are not stored in the clear', () => {
    const evidence = randomBytes();
    sim.report('D', MULE, evidence);
    expect(ledgerDump(sim)).not.toContain(needle(evidence));
  });

  it('without the consortium key, an outsider cannot find an account on the ledger', () => {
    const guess = pureCircuits.accountTag(randomBytes(), MULE);
    expect(sim.ledger.reportCount.member(guess)).toBe(false);
    expect(sim.ledger.flagged.member(guess)).toBe(false);
  });

  it('with the consortium key, a member finds the account off-chain', () => {
    expect(sim.ledger.flagged.member(pureCircuits.accountTag(sim.consortiumKey, MULE))).toBe(true);
  });

  it('a lookup is a pure read: it creates no transaction and changes nothing', () => {
    const before = ledgerDump(sim);
    sim.isFlagged(MULE);
    sim.isFlagged(INNOCENT);
    expect(ledgerDump(sim)).toBe(before);
  });
});

// =====================================================================
describe('privacy of transaction transcripts', () => {
  let sim: MuleNetSimulator;
  beforeEach(() => {
    sim = consortium().sim;
  });

  it('positive control: the disclosed account tag IS visible in the transcript', () => {
    sim.report('A', MULE);
    expect(dump(sim.lastPublicTranscript)).toContain(needle(sim.tag(MULE)));
  });

  it('a report transcript does not contain the account identifier', () => {
    sim.report('A', MULE);
    expect(dump(sim.lastPublicTranscript)).not.toContain(needle(MULE));
  });

  it("a report transcript does not contain the bank's secret", () => {
    sim.report('A', MULE);
    expect(dump(sim.lastPublicTranscript)).not.toContain(needle(sim.privateState('A').bankSecret!));
  });

  it("a report transcript does not contain the bank's leaf (identity)", () => {
    sim.report('B', MULE);
    expect(dump(sim.lastPublicTranscript)).not.toContain(
      needle(pureCircuits.bankLeaf(sim.privateState('B').bankSecret!)),
    );
  });

  it('a report transcript does not contain the consortium key', () => {
    sim.report('A', MULE);
    expect(dump(sim.lastPublicTranscript)).not.toContain(needle(sim.consortiumKey));
  });

  it('a report transcript does not contain the evidence hash', () => {
    const evidence = randomBytes();
    sim.report('A', MULE, evidence);
    expect(dump(sim.lastPublicTranscript)).not.toContain(needle(evidence));
  });

  it('a retraction transcript does not contain the account or bank', () => {
    sim.report('C', MULE);
    sim.retract('C', MULE);
    const t = dump(sim.lastPublicTranscript);
    expect(t).not.toContain(needle(MULE));
    expect(t).not.toContain(needle(sim.privateState('C').bankSecret!));
  });

  it("a regulator transcript does not contain the regulator's secret", () => {
    sim.registerBank(randomBytes());
    expect(dump(sim.lastPublicTranscript)).not.toContain(needle(sim.privateState(REGULATOR).regulatorSecret!));
  });

  it('reports from two different banks look structurally identical', () => {
    sim.report('A', MULE);
    const t1 = sim.lastPublicTranscript.length;
    sim.report('B', MULE_2);
    expect(sim.lastPublicTranscript.length).toBe(t1);
  });
});

// =====================================================================
describe('end-to-end scenario', () => {
  it('UPI fraud ring: three banks flag a mule, one appeal succeeds, the ring is re-flagged', () => {
    const { sim } = consortium(3n, ['SBI', 'HDFC', 'ICICI', 'Axis', 'Kotak']);
    const ring = [MULE, MULE_2];

    // Victims report to their banks; each bank independently flags the mule accounts.
    for (const bank of ['SBI', 'HDFC', 'ICICI']) for (const acct of ring) sim.report(bank, acct);
    expect(ring.every((a) => sim.isFlagged(a))).toBe(true);

    // A fifth bank checks a payee before releasing a transfer (off-chain lookup).
    expect(sim.isFlagged(MULE)).toBe(true);
    expect(sim.isFlagged(INNOCENT)).toBe(false);

    // The holder of MULE_2 proves to the regulator that their account was hijacked.
    sim.delist(sim.tag(MULE_2));
    expect(sim.isFlagged(MULE_2)).toBe(false);

    // The account is reused by the ring; fresh reports flag it again.
    for (const bank of ['Axis', 'Kotak', 'SBI']) sim.report(bank, MULE_2);
    expect(sim.isFlagged(MULE_2)).toBe(true);
    expect(sim.round(MULE_2)).toBe(1n);

    expect(sim.ledger.totalReports).toBe(9n);
    expect(sim.ledger.totalDelisted).toBe(1n);
  });

  it('a bank that only joins later can immediately check every flag', () => {
    const { sim } = consortium();
    for (const b of ['A', 'B', 'C']) sim.report(b, MULE);
    const late = sim.addBank('Late');
    sim.registerBank(late);
    // Late bank derives the tag with its own copy of the consortium key.
    const ps = sim.privateState('Late') as MuleNetPrivateState;
    expect(sim.ledger.flagged.member(pureCircuits.accountTag(ps.consortiumKey, MULE))).toBe(true);
  });
});
