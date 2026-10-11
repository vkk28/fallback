import { spawn, execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync, openSync, closeSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createConnection } from 'node:net';
const root = fileURLToPath(new URL('../', import.meta.url));
const directory = root + '.tools/services/';
const [operation = 'status', selected] = process.argv.slice(2);
if (!['start', 'stop', 'status'].includes(operation) || (selected && !['web', 'database', 'worker', 'indexer', 'staging'].includes(selected))) throw new Error('Use start|stop|status [web|database|worker|indexer|staging]');
if (Number(process.versions.node.split('.')[0]) !== 24) throw new Error('Select the pinned Node 24 runtime first');
process.umask(0o077);
mkdirSync(directory, { recursive: true, mode: 0o700 });
function record(service) {
  try { return JSON.parse(readFileSync(directory + service + '.json', 'utf8')); } catch { return null; }
}
function owned(service, r) {
  if (!r || !Number.isSafeInteger(r.pid) || !/^[a-f0-9]{24}$/.test(r.marker)) return false;
  try {
    process.kill(r.pid, 0);
    // Read only the PID we created; compare in memory, never log process arguments.
    const command = execFileSync('/bin/ps', ['-p', String(r.pid), '-o', 'command='], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return command === `fallback-local-${service}-${r.marker}`;
  } catch { return false; }
}
function listening(port) {
  return new Promise(resolve => {
    const socket = createConnection({ host: '127.0.0.1', port });
    const done = value => { socket.destroy(); resolve(value); };
    socket.once('connect', () => done(true)); socket.once('error', () => done(false)); socket.setTimeout(500, () => done(false));
  });
}
// Worker/indexer are opt-in; ordinary startup requires no signing credential.
for (const service of selected ? [selected] : ['database', 'web']) {
  const port = { web: 3000, database: 54329, indexer: 9898, staging: 3001 }[service];
  let r = record(service), managed = owned(service, r);
  if (operation === 'stop' && managed) {
    process.kill(r.pid, 'SIGTERM');
    for (let i = 0; i < 20 && owned(service, r); i++) await new Promise(resolve => setTimeout(resolve, 250));
    console.log(JSON.stringify({ service, stopRequested: true, stopped: !owned(service, r) }));
    continue;
  }
  if (operation === 'start' && !managed) {
    if (port && await listening(port)) { console.log(JSON.stringify({ service, listening: true, managed: false, startup: 'Existing listener preserved' })); continue; }
    if (service === 'web' && !existsSync(root + 'apps/web/.next/BUILD_ID')) throw new Error('Complete web:build before starting production web');
    const marker = randomBytes(12).toString('hex');
    const log = openSync(directory + service + '.log', 'a', 0o600);
    const child = spawn(process.execPath, [root + 'scripts/local-service-runner.mjs', service, marker], { cwd: root, detached: true, stdio: ['ignore', log, log], env: process.env });
    closeSync(log);
    if (!child.pid) throw new Error('Owned local service did not launch');
    child.unref();
    r = { pid: child.pid, marker, startedAt: new Date().toISOString() };
    writeFileSync(directory + service + '.json', JSON.stringify(r), { mode: 0o600 });
    if (port) for (let i = 0; i < 40 && !await listening(port); i++) await new Promise(resolve => setTimeout(resolve, 250));
    else await new Promise(resolve => setTimeout(resolve, 1000));
    managed = owned(service, r);
  }
  console.log(JSON.stringify({ service, managed, ...(port ? { listening: await listening(port) } : {}) }));
}
