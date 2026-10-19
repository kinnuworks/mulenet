// The MuleNet demo story, run end-to-end with real proofs on a real network.
// SPDX-License-Identifier: Apache-2.0

import fs from 'node:fs/promises';
import path from 'node:path';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { type Logger } from 'pino';
import { type Config, repoRoot } from './config.js';
import { MuleNetAPI, type RegistrySnapshot, type TxReceipt, randomBytes } from './api.js';
import { type Session } from './session.js';

export const BANKS = ['SBI', 'HDFC', 'ICICI', 'Axis', 'Kotak'] as const;

/** Fictitious accounts in "IFSC:account" form. */
export const ACCOUNTS = {
  muleA: 'SBIN0001234:00011122233',
  muleB: 'HDFC0004321:50100099988',
  hijacked: 'UTIB0000999:918010045671',
  innocent: 'ICIC0000777:000401500123',
} as const;

export type Rejection = { step: string; actor: string; expected: string; error: string };

export type Secrets = {
  network: string;
  contractAddress: string;
  consortiumKey: string;
  regulatorSecret: string;
  bankSecrets: Record<string, string>;
  bankIndex: Record<string, number>;
  walletSeed: string;
};

export type DeploymentRecord = {
  network: string;
  contractAddress: string;
  compiler: string;
  threshold: number;
  banks: string[];
  transactions: TxReceipt[];
  rejectedAttempts: Rejection[];
  offChainChecks: { account: string; flagged: boolean; reports: number }[];
  finalState: RegistrySnapshot;
  startedAt: string;
  finishedAt: string;
};

const expectRejection = async (
  rejections: Rejection[],
  step: string,
  actor: string,
  expected: string,
  fn: () => Promise<unknown>,
  logger: Logger,
) => {
  try {
    await fn();
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    if (!error.includes(expected)) throw new Error(`${step}: expected '${expected}', got '${error}'`);
    rejections.push({ step, actor, expected, error });
    logger.info(`✘ ${step} — rejected as expected: ${expected}`);
    return;
  }
  throw new Error(`${step}: should have been rejected but succeeded`);
};

export const runStory = async (config: Config, session: Session, logger: Logger): Promise<DeploymentRecord> => {
  const startedAt = new Date().toISOString();
  const threshold = 3;
  const rejections: Rejection[] = [];
  const checks: DeploymentRecord['offChainChecks'] = [];

  const consortiumKey = randomBytes();
  const regulatorSecret = randomBytes();
  const api = await MuleNetAPI.deploy(session.providers, { threshold, consortiumKey, regulatorSecret }, logger);

  // Act 1: the regulator licenses five banks.
  const bankSecrets: Record<string, Uint8Array> = {};
  const bankIndex: Record<string, number> = {};
  for (const [i, bank] of BANKS.entries()) {
    bankSecrets[bank] = randomBytes();
    const leaf = await api.addBank(bank, bankSecrets[bank]);
    await api.registerBank(leaf, `Register ${bank}`);
    bankIndex[bank] = i;
  }

  // Secrets are saved as soon as they exist, so a crash mid-story is recoverable.
  const saveSecrets = async () => {
    const secrets: Secrets = {
      network: config.network,
      contractAddress: api.contractAddress,
      consortiumKey: toHex(consortiumKey),
      regulatorSecret: toHex(regulatorSecret),
      bankSecrets: Object.fromEntries(Object.entries(bankSecrets).map(([k, v]) => [k, toHex(v)])),
      bankIndex,
      walletSeed: session.seed,
    };
    const file = path.resolve(repoRoot, '.secrets', `${config.network}.json`);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(secrets, null, 2), { mode: 0o600 });
  };
  await saveSecrets();

  // Act 2: victims complain to three different banks about the same payee.
  await api.report('HDFC', ACCOUNTS.muleA, 'NCRP complaint 31609240012345: UPI scam, Rs 48,000', 'HDFC reports mule A');
  await api.report('ICICI', ACCOUNTS.muleA, 'NCRP complaint 31609240012377: fake KYC call, Rs 1,20,000', 'ICICI reports mule A');

  // Attack: one bank tries to push the account over the threshold alone.
  await expectRejection(rejections, 'ICICI reports mule A a second time', 'ICICI', 'already reported this account',
    () => api.report('ICICI', ACCOUNTS.muleA, 'duplicate'), logger);

  // Attack: an unlicensed fintech that obtained the consortium key tries to report.
  await api.addBank('ShadowPay');
  await expectRejection(rejections, 'Unlicensed ShadowPay reports mule A', 'ShadowPay', 'membership path is for a different bank',
    () => api.report('ShadowPay', ACCOUNTS.muleA, 'fabricated'), logger);

  await api.report('Axis', ACCOUNTS.muleA, 'NCRP complaint 31609240012401: investment scam, Rs 75,000', 'Axis reports mule A (threshold reached)');

  // Act 3: before releasing a UPI payment, Kotak checks the payee. No transaction is created.
  for (const account of [ACCOUNTS.muleA, ACCOUNTS.innocent]) {
    const c = await api.check(account);
    checks.push({ account, flagged: c.flagged, reports: c.reports });
    logger.info(`Payee check ${account}: ${c.flagged ? 'FLAGGED — block payment' : 'clear'} (${c.reports}/${c.threshold})`);
  }

  // Act 4: a false positive is withdrawn by the bank that filed it.
  await api.report('Kotak', ACCOUNTS.muleB, 'Velocity alert: 40 inbound UPI credits in 1 hour', 'Kotak reports mule B');
  await api.retract('Kotak', ACCOUNTS.muleB, 'Kotak retracts its report on mule B (merchant festival sales)');

  // Act 5: a hijacked account is flagged, the customer appeals, the regulator delists it.
  await api.report('SBI', ACCOUNTS.hijacked, 'SIM-swap takeover, complaint 31609240012555', 'SBI reports hijacked account');
  await api.report('HDFC', ACCOUNTS.hijacked, 'Outbound transfers to mule A', 'HDFC reports hijacked account');
  await api.report('Kotak', ACCOUNTS.hijacked, 'Linked to mule A cash-out', 'Kotak reports hijacked account (threshold reached)');
  await api.addRegulator(regulatorSecret);
  await api.delist(ACCOUNTS.hijacked, 'Regulator delists hijacked account after appeal');

  // Act 6: Kotak's licence is suspended; it can no longer report.
  await api.revokeBank(BigInt(bankIndex.Kotak), 'Regulator revokes Kotak');
  await expectRejection(rejections, 'Revoked Kotak reports mule B', 'Kotak', 'membership path is for a different bank',
    () => api.report('Kotak', ACCOUNTS.muleB, 'after revocation'), logger);

  const finalState = await api.snapshot();
  const record: DeploymentRecord = {
    network: config.network,
    contractAddress: api.contractAddress,
    compiler: 'compact 0.31.1 (ledger 8)',
    threshold,
    banks: [...BANKS],
    transactions: api.receipts,
    rejectedAttempts: rejections,
    offChainChecks: checks,
    finalState,
    startedAt,
    finishedAt: new Date().toISOString(),
  };
  await fs.mkdir(path.dirname(config.deploymentFile), { recursive: true });
  await fs.writeFile(config.deploymentFile, JSON.stringify(record, null, 2));
  logger.info(`Story complete: ${api.receipts.length} transactions, ${rejections.length} attacks rejected.`);
  logger.info(`Receipt written to ${path.relative(repoRoot, config.deploymentFile)}`);
  return record;
};
