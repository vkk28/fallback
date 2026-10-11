import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const [service, marker] = process.argv.slice(2);
if (!['web', 'database', 'worker', 'indexer', 'staging'].includes(service) || !/^[a-f0-9]{24}$/.test(marker || '')) throw new Error('Invalid local service');
process.title = `fallback-local-${service}-${marker}`;
const commands = {
  web: [root + 'scripts/web.mjs', 'start', '--hostname', '127.0.0.1'],
  database: [root + 'scripts/postgres-local.mjs'],
  worker: ['--env-file=' + root + '.env', '--import', 'tsx', root + 'apps/worker/src/main.ts'],
  indexer: [root + 'scripts/indexer-local.mjs'],
  staging: ['--import', 'tsx', root + 'scripts/staging-relay.ts'],
};
const args = commands[service];
const child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit', env: process.env });
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
child.on('error', () => { console.error('Owned local service could not start.'); process.exitCode = 1; });
child.on('exit', code => process.exit(code ?? 1));
