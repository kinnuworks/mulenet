// HTTP API for the MuleNet console. Each bank in the demo is an actor with its own private
// state; in production every bank runs this service itself and holds only its own secret.
// SPDX-License-Identifier: Apache-2.0

import fs from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';
import { fromHex } from '@midnight-ntwrk/midnight-js-utils';
import { type Logger } from 'pino';
import { type Config, repoRoot } from './config.js';
import { MuleNetAPI, type TxReceipt } from './api.js';
import { type Session } from './session.js';
import { type DeploymentRecord, type Secrets } from './story.js';
import { pureCircuits } from '../../contract/src/index.js';

type Json = Record<string, unknown> | unknown[];

const readJson = async <T>(file: string): Promise<T | undefined> => {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as T;
  } catch {
    return undefined;
  }
};

const body = async (req: IncomingMessage): Promise<Record<string, string>> => {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? (JSON.parse(raw) as Record<string, string>) : {};
};

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

export const serve = async (config: Config, session: Session, logger: Logger, port: number) => {
  const secrets = await readJson<Secrets>(path.resolve(repoRoot, '.secrets', `${config.network}.json`));
  if (!secrets) throw new Error(`No .secrets/${config.network}.json. Run 'npm run story:${config.network}' first.`);
  const deployment = await readJson<DeploymentRecord>(config.deploymentFile);

  const api = await MuleNetAPI.connect(session.providers, secrets.contractAddress, fromHex(secrets.consortiumKey), logger);
  await api.addRegulator(fromHex(secrets.regulatorSecret));
  for (const [bank, sk] of Object.entries(secrets.bankSecrets)) await api.addBank(bank, fromHex(sk));
  // A bank is active iff its leaf is currently in the on-chain Merkle tree.
  const bankStatus = async () => {
    const l = await api.ledger();
    return Object.entries(secrets.bankSecrets).map(([name, sk]) => ({
      name,
      active: l.banks.findPathForLeaf(pureCircuits.bankLeaf(fromHex(sk))) !== undefined,
    }));
  };

  // One wallet signs everything, so transactions are submitted strictly one at a time.
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(fn: () => Promise<T>): Promise<T> => {
    const next = queue.then(fn, fn);
    queue = next.catch(() => undefined);
    return next;
  };
  const liveTx: TxReceipt[] = [];
  const track = async (p: Promise<TxReceipt>) => {
    const r = await p;
    liveTx.push(r);
    return r;
  };

  const uiDir = path.resolve(repoRoot, 'ui', 'dist');

  const send = (res: ServerResponse, status: number, data: Json) => {
    res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
    res.end(JSON.stringify(data));
  };

  const routes: Record<string, (req: IncomingMessage, url: URL) => Promise<Json>> = {
    'GET /api/state': async () => ({
      network: config.network,
      contractAddress: api.contractAddress,
      banks: await bankStatus(),
      registry: await api.snapshot(),
      transactions: [...(deployment?.transactions ?? []), ...liveTx],
      rejectedAttempts: deployment?.rejectedAttempts ?? [],
    }),
    'GET /api/check': async (_req, url) => api.check(url.searchParams.get('account') ?? ''),
    'GET /api/evidence': async (_req, url) => api.evidenceLog(url.searchParams.get('bank') ?? ''),
    'POST /api/report': async (req) => {
      const { bank, account, evidence } = await body(req);
      return track(serial(() => api.report(bank, account, evidence || 'no evidence attached', `${bank} reports ${account}`)));
    },
    'POST /api/retract': async (req) => {
      const { bank, account } = await body(req);
      return track(serial(() => api.retract(bank, account, `${bank} retracts ${account}`)));
    },
    'POST /api/delist': async (req) => {
      const { account } = await body(req);
      return track(serial(() => api.delist(account, `Regulator delists ${account}`)));
    },
  };

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST',
        'access-control-allow-headers': 'content-type',
      });
      return res.end();
    }
    const route = routes[`${req.method} ${url.pathname}`];
    if (route) {
      try {
        return send(res, 200, await route(req, url));
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        logger.warn(`${req.method} ${url.pathname} failed: ${message}`);
        return send(res, 400, { error: message });
      }
    }
    // Static UI (single-page app fallback to index.html).
    const file = path.resolve(uiDir, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
    const target = file.startsWith(uiDir) && (await fs.stat(file).catch(() => null))?.isFile() ? file : path.join(uiDir, 'index.html');
    try {
      const data = await fs.readFile(target);
      res.writeHead(200, { 'content-type': MIME[path.extname(target)] ?? 'application/octet-stream' });
      res.end(data);
    } catch {
      send(res, 404, { error: 'UI not built. Run: npm run build --workspace ui' });
    }
  });
  server.listen(port, () => logger.info(`MuleNet console on http://localhost:${port}  (contract ${api.contractAddress})`));
  return server;
};
