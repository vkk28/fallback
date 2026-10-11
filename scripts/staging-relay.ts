import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { stagingRelay } from '../packages/backend/src/staging-relay.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const env = parseEnv(await readFile(root + '.env', 'utf8'));
const instance = randomUUID();
const server = createServer(stagingRelay({ secret: env.CRE_RELAY_SECRET || '', instance, appOrigin: env.APP_ORIGIN || 'http://localhost:3000' }));
process.umask(0o077);
await mkdir(root + '.tools/cre-staging/', { recursive: true, mode: 0o700 });
server.on('error', () => { console.error('LOCAL_STAGING_RELAY_LISTENER_UNAVAILABLE'); process.exitCode = 1; });
server.listen(3001, '127.0.0.1', async () => {
  await writeFile(root + '.tools/cre-staging/instance.json', JSON.stringify({ instance, origin: 'http://127.0.0.1:3001' }), { mode: 0o600 });
  console.log('Local-only scheduler relay listening on127.0.0.1:3001; no tunnel/publication started.');
});
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => process.exit(0)));
