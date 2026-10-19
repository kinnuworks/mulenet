// Starts a network environment, a funded wallet and the midnight-js providers.
// Wallet/funding flow adapted from midnightntwrk/example-bboard (Apache-2.0).
// SPDX-License-Identifier: Apache-2.0

import { WebSocket } from 'ws';
import { type Logger } from 'pino';
import { type TestEnvironment } from '@midnight-ntwrk/testkit-js';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { type MuleNetPrivateState } from '../../contract/src/index.js';
import { type Config } from './config.js';
import { MidnightWalletProvider } from './midnight-wallet-provider.js';
import { syncWallet, waitForUnshieldedFunds } from './wallet-utils.js';
import { generateDust } from './generate-dust.js';
import { type MuleNetCircuit, type MuleNetProviders, randomBytes } from './api.js';

(globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;

/** Seed that owns the genesis mint on a local dev node. Only valid for standalone. */
const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

export type Session = {
  readonly providers: MuleNetProviders;
  readonly walletProvider: MidnightWalletProvider;
  readonly env: TestEnvironment;
  readonly seed: string;
  stop(): Promise<void>;
};

export const startSession = async (config: Config, logger: Logger): Promise<Session> => {
  const env = config.getEnvironment(logger);
  const envConfiguration = await env.start();
  logger.info(`Environment ready: indexer ${envConfiguration.indexer.split('?')[0]}, proof server ${envConfiguration.proofServer}`);

  const seed =
    config.network === 'standalone'
      ? GENESIS_MINT_WALLET_SEED
      : (process.env.MULENET_WALLET_SEED?.trim() ?? toHex(randomBytes(32)));
  if (config.network !== 'standalone' && !process.env.MULENET_WALLET_SEED) {
    logger.warn(`No MULENET_WALLET_SEED set; generated a new wallet. Save this seed to reuse it: ${seed}`);
  }

  const walletProvider = await MidnightWalletProvider.build(logger, envConfiguration, seed);
  await walletProvider.start();

  const unshielded = await waitForUnshieldedFunds(logger, walletProvider.wallet, envConfiguration, unshieldedToken());
  logger.info(`NIGHT balance: ${unshielded.balances[unshieldedToken().raw] ?? 0n}`);
  if (config.generateDust) {
    const dustTx = await generateDust(logger, seed, unshielded, walletProvider.wallet);
    if (dustTx) await syncWallet(logger, walletProvider.wallet);
  }

  const zkConfigProvider = new NodeZkConfigProvider<MuleNetCircuit>(config.zkConfigPath);
  const providers: MuleNetProviders = {
    privateStateProvider: levelPrivateStateProvider<string, MuleNetPrivateState>({
      privateStateStoreName: config.privateStateStoreName,
      signingKeyStoreName: `${config.privateStateStoreName}-signing-keys`,
      privateStoragePasswordProvider: () => process.env.MULENET_STORAGE_PASSWORD ?? 'MuleNet-Local-Dev-2026!',
      accountId: seed,
    }),
    publicDataProvider: indexerPublicDataProvider(envConfiguration.indexer, envConfiguration.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(envConfiguration.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };

  return {
    providers,
    walletProvider,
    env,
    seed,
    async stop() {
      try {
        await walletProvider.stop();
      } finally {
        await env.shutdown();
      }
    },
  };
};
