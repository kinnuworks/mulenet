// Network configurations. Adapted from midnightntwrk/example-bboard (Apache-2.0).
// SPDX-License-Identifier: Apache-2.0

import path from 'node:path';
import {
  defaultContainersConfiguration,
  type EnvironmentConfiguration,
  LocalTestEnvironment,
  RemoteTestEnvironment,
  setContainersConfiguration,
  type TestEnvironment,
} from '@midnight-ntwrk/testkit-js';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { type Logger } from 'pino';

export type NetworkName = 'standalone' | 'preview' | 'preprod';

export const currentDir = path.resolve(new URL(import.meta.url).pathname, '..');
export const repoRoot = path.resolve(currentDir, '..', '..');
const cliDir = path.resolve(repoRoot, 'cli');

// testkit looks for compose.yml / proof-server.yml in the cwd captured at import time;
// point it at this package regardless of where the command is run from.
setContainersConfiguration({
  ...defaultContainersConfiguration,
  standalone: { ...defaultContainersConfiguration.standalone, path: cliDir },
  proofServer: { ...defaultContainersConfiguration.proofServer, path: cliDir },
});

export interface Config {
  readonly network: NetworkName;
  readonly privateStateStoreName: string;
  readonly logDir: string;
  readonly zkConfigPath: string;
  readonly deploymentFile: string;
  readonly generateDust: boolean;
  getEnvironment(logger: Logger): TestEnvironment;
}

const base = (network: NetworkName) => ({
  network,
  privateStateStoreName: `mulenet-${network}-private-state`,
  logDir: path.resolve(repoRoot, 'logs', network, `${new Date().toISOString()}.log`),
  zkConfigPath: path.resolve(repoRoot, 'contract', 'src', 'managed', 'mulenet'),
  deploymentFile: path.resolve(repoRoot, 'deployments', `${network}.json`),
});

/** A throwaway local network (node + indexer + proof server) in Docker. */
export const standaloneConfig = (): Config => ({
  ...base('standalone'),
  generateDust: false,
  getEnvironment(logger) {
    setNetworkId('undeployed');
    return new LocalTestEnvironment(logger);
  },
});

const withProofServer = (env: RemoteTestEnvironment): string => {
  const container = (env as unknown as { proofServerContainer?: { getUrl(): string } }).proofServerContainer;
  if (!container) throw new Error('Proof server container is not available.');
  return container.getUrl();
};

class PreviewEnvironment extends RemoteTestEnvironment {
  getEnvironmentConfiguration(): EnvironmentConfiguration {
    return {
      walletNetworkId: 'preview',
      networkId: 'preview',
      indexer: 'https://indexer.preview.midnight.network/api/v4/graphql',
      indexerWS: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
      node: 'https://rpc.preview.midnight.network',
      nodeWS: 'wss://rpc.preview.midnight.network',
      faucet: 'https://midnight-tmnight-preview.nethermind.dev/',
      proofServer: withProofServer(this),
    };
  }
}

class PreprodEnvironment extends RemoteTestEnvironment {
  getEnvironmentConfiguration(): EnvironmentConfiguration {
    // The Preprod indexer and node RPC are served by Blockfrost and need a project token.
    const projectId = process.env.BLOCKFROST_PROJECT_ID?.trim();
    if (!projectId) throw new Error('BLOCKFROST_PROJECT_ID is not set (free key at blockfrost.io, Midnight Preprod).');
    const key = (url: string) => `${url}?project_id=${encodeURIComponent(projectId)}`;
    return {
      walletNetworkId: 'preprod',
      networkId: 'preprod',
      indexer: key('https://midnight-preprod.blockfrost.io/api/v0'),
      indexerWS: key('wss://midnight-preprod.blockfrost.io/api/v0/ws'),
      node: key('https://rpc.midnight-preprod.blockfrost.io'),
      nodeWS: key('wss://rpc.midnight-preprod.blockfrost.io'),
      faucet: 'https://midnight-tmnight-preprod.nethermind.dev/',
      proofServer: withProofServer(this),
    };
  }

  // testkit-js 4.1.1 drops the query string from its health-check URLs, so Blockfrost
  // rejects them for lack of a token. Run the checks with the token instead.
  healthCheck = async () => {
    const { node, indexer, proofServer } = this.getEnvironmentConfiguration();
    for (const [name, baseUrl, p] of [
      ['node', node, '/health'],
      ['indexer', indexer, '/ready'],
      ['proof server', proofServer, '/health'],
    ] as const) {
      const url = new URL(baseUrl);
      url.pathname = p;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`The ${name} health check failed with HTTP ${response.status}.`);
    }
  };
}

export const previewConfig = (): Config => ({
  ...base('preview'),
  generateDust: true,
  getEnvironment(logger) {
    setNetworkId('preview');
    return new PreviewEnvironment(logger);
  },
});

export const preprodConfig = (): Config => ({
  ...base('preprod'),
  generateDust: true,
  getEnvironment(logger) {
    setNetworkId('preprod');
    return new PreprodEnvironment(logger);
  },
});

export const configFor = (network: string): Config => {
  switch (network) {
    case 'standalone':
      return standaloneConfig();
    case 'preview':
      return previewConfig();
    case 'preprod':
      return preprodConfig();
    default:
      throw new Error(`Unknown network '${network}'. Use standalone, preview or preprod.`);
  }
};
