// Usage: tsx src/launcher/serve.ts <standalone|preview|preprod> [port]
// On standalone the local chain is fresh each run, so the story is replayed first.
// SPDX-License-Identifier: Apache-2.0

import { configFor } from '../config.js';
import { createLogger } from '../logger-utils.js';
import { startSession } from '../session.js';
import { serve } from '../server.js';
import { runStory } from '../story.js';

const config = configFor(process.argv[2] ?? 'standalone');
const port = Number(process.argv[3] ?? process.env.PORT ?? 8787);
const logger = await createLogger(config.logDir);
const session = await startSession(config, logger);
if (config.network === 'standalone') await runStory(config, session, logger);
await serve(config, session, logger, port);

const shutdown = async () => {
  await session.stop().catch(() => undefined);
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
