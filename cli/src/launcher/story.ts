// Usage: tsx src/launcher/story.ts <standalone|preview|preprod>
// SPDX-License-Identifier: Apache-2.0

import { configFor } from '../config.js';
import { createLogger } from '../logger-utils.js';
import { startSession } from '../session.js';
import { runStory } from '../story.js';

const config = configFor(process.argv[2] ?? 'standalone');
const logger = await createLogger(config.logDir);
const session = await startSession(config, logger);
let exitCode = 0;
try {
  await runStory(config, session, logger);
} catch (e) {
  logger.error(e instanceof Error ? `${e.message}\n${e.stack}` : String(e));
  exitCode = 1;
} finally {
  await session.stop().catch((e) => logger.error(`shutdown: ${String(e)}`));
}
process.exit(exitCode);
