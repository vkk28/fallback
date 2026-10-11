import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url)), directory = root + '.tools/cre-staging/';
if (process.argv.slice(2).join(' ') !== '--publish-scheduler') throw new Error('Explicit publication authorization required before --publish-scheduler');
process.umask(0o077);
const instance = JSON.parse(await readFile(directory + 'instance.json', 'utf8'));
const local = await fetch('http://127.0.0.1:3001/health', { redirect: 'error', signal: AbortSignal.timeout(5000) }).then(r => r.json());
if (local.instance !== instance.instance || local.service !== 'fallback-scheduler-relay') throw new Error('Owned local scheduler relay is not ready');
await mkdir(directory, { recursive: true, mode: 0o700 });
await writeFile(directory + 'cloudflared.yaml', '{}\n', { mode: 0o600 });
const env = Object.fromEntries(['PATH', 'HOME', 'TMPDIR'].flatMap(key => process.env[key] ? [[key, process.env[key]]] : []));
const child = spawn(root + '.tools/cloudflared/cloudflared', ['tunnel', '--config', directory + 'cloudflared.yaml', '--no-autoupdate', '--url', 'http://127.0.0.1:3001', '--metrics', '127.0.0.1:20245'], { cwd: directory, env, stdio: ['ignore', 'pipe', 'pipe'] });
let origin, verifying = false, output = '';
async function observe(chunk) {
  // Parse only the public URL. No raw tunnel diagnostics/token/HTTP logs are saved.
  output = (output + chunk.toString()).slice(-12000);
  const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com\b/);
  if (match && !origin) {
    origin = match[0];
    await writeFile(directory + 'tunnel.json', JSON.stringify({ origin, pid: child.pid, instance: instance.instance, startedAt: new Date().toISOString() }), { mode: 0o600 });
    console.log(`Temporary scheduler-only HTTPS origin: ${origin}`);
  }
  if (origin && !verifying && /Registered tunnel connection/.test(output)) {
    verifying = true;
    try {
      const remote = await fetch(origin + '/health', { redirect: 'error', signal: AbortSignal.timeout(15000) }).then(r => r.json());
      if (remote.instance !== instance.instance || remote.service !== 'fallback-scheduler-relay') throw new Error('Proof mismatch');
      await writeFile(directory + 'verified-origin.json', JSON.stringify({ origin, instance: instance.instance, verifiedAt: new Date().toISOString() }), { mode: 0o600 });
      console.log('Actual HTTPS origin matches the owned local relay; no scheduler credential forwarded by this publisher.');
    } catch { console.error('HTTPS relay proof unavailable; do not send credentials until verified.'); verifying = false; }
  }
}
child.stdout.on('data', chunk => { void observe(chunk); }); child.stderr.on('data', chunk => { void observe(chunk); });
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
child.on('error', () => { console.error('Project tunnel process could not start.'); process.exitCode = 1; });
child.on('exit', code => process.exit(code ?? 1));
