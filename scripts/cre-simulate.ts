import { spawn, execFileSync } from 'node:child_process';
import { chmod, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { approvedCreOrigin, creProcessEnvironment, relayOnlyEnvironment } from '../packages/backend/src/cre-simulation.js';

const root = fileURLToPath(new URL('../', import.meta.url));
try {
  const [flag, authorization, ...extra] = process.argv.slice(2);
  if (flag !== '--authorized-origin' || !authorization || extra.length) throw new Error('EXPLICIT_AUTHORIZED_ORIGIN_REQUIRED');
  const config = JSON.parse(await readFile(root + 'workflows/cre/config.staging.json', 'utf8'));
  const origin = approvedCreOrigin(config.apiOrigin, authorization);
  if (new URL(origin).hostname.endsWith('.trycloudflare.com')) {
    const tunnel = JSON.parse(await readFile(root + '.tools/cre-staging/tunnel.json', 'utf8'));
    const local = JSON.parse(await readFile(root + '.tools/cre-staging/instance.json', 'utf8'));
    if (tunnel.origin !== origin || tunnel.instance !== local.instance || !Number.isSafeInteger(tunnel.pid)) throw new Error('ACTIVE_OWNED_RELAY_REQUIRED');
    process.kill(tunnel.pid, 0);
    const command = execFileSync('/bin/ps', ['-p', String(tunnel.pid), '-o', 'command='], { encoding: 'utf8' });
    if (!command.includes(root + '.tools/cloudflared/cloudflared') || !command.includes('--url http://127.0.0.1:3001') || !command.includes(root + '.tools/cre-staging/cloudflared.yaml')) throw new Error('ACTIVE_OWNED_RELAY_REQUIRED');
    const response = await fetch(origin + '/health', { redirect: 'error', signal: AbortSignal.timeout(15000) });
    const health = await response.json();
    if (!response.ok || health.service !== 'fallback-scheduler-relay' || health.instance !== local.instance) throw new Error('ACTIVE_OWNED_RELAY_REQUIRED');
  }
  const wasm = root + 'workflows/cre/main.wasm', binary = await stat(wasm);
  for (const source of ['workflows/cre/main.ts', 'workflows/cre/handler.ts', 'packages/domain/src/scheduling.ts', 'pnpm-lock.yaml']) {
    if ((await stat(root + source)).mtimeMs > binary.mtimeMs) throw new Error('REBUILD_CRE_WASM_REQUIRED');
  }
  const env = parseEnv(await readFile(root + '.env', 'utf8'));
  const onlyRelay = relayOnlyEnvironment(env.CRE_RELAY_SECRET);
  const directory = root + '.tools/cre-simulation/';
  process.umask(0o077);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(directory + 'relay.env', onlyRelay, { mode: 0o600 });
  await chmod(directory + 'relay.env', 0o600);
  // Prebuilt WASM skips Bun compilation/default dotenv loading. Never pass the full app env.
  const child = spawn(root + '.tools/cre/cre_v1.37.0_darwin_arm64', ['-R', root, '-T', 'staging-settings', '-e', directory + 'relay.env', '--non-interactive', 'workflow', 'simulate', root + 'workflows/cre', '--wasm', wasm, '--trigger-index', '0', '--limits', 'default'], { cwd: directory, env: creProcessEnvironment(process.env), stdio: ['ignore', 'pipe', 'pipe'] });
  let diagnostic = '';
  const capture = (chunk: Buffer) => { diagnostic = (diagnostic + chunk.toString()).slice(-12000); };
  child.stdout.on('data', capture); child.stderr.on('data', capture);
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  const code = await new Promise<number>(resolve => { child.once('error', () => resolve(1)); child.once('exit', value => resolve(value ?? 1)); });
  const log = /Scanned (\d+) plans; accepted (\d+) job requests, skipped (\d+) stale candidates/.exec(diagnostic);
  const evidence = { observedAt: new Date().toISOString(), adapterOrigin: origin, environmentVariablesForwarded: ['CRE_RELAY_SECRET'], productionLimits: 'default', prebuiltWasm: true, cliExitCode: code, workflowResultVerified: code === 0 && !!log, result: log ? { scanned: Number(log[1]), accepted: Number(log[2]), stale: Number(log[3]) } : null, deploymentPerformed: false, verifiedPaymentReceipt: false };
  await writeFile(root + 'docs/evidence/cre-simulation.json', JSON.stringify(evidence, null, 2) + '\n');
  if (code !== 0) {
    // Only sanitized failure lines; never persist raw CLI/account/HTTP logs.
    for (const value of Object.values(env).filter(value => value.length >= 8).sort((a, b) => b.length - a.length)) diagnostic = diagnostic.split(value).join('[configured-value]');
    diagnostic = diagnostic.replace(/Bearer\s+\S+|eyJ[A-Za-z0-9._-]+/g, '[authorization]').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[account-email]').replace(/\b(?:user|org|did)_[A-Za-z0-9_-]+\b/g, '[account-id]').replace(/\b[a-f0-9]{32,}\b/gi, '[id]');
    diagnostic = diagnostic.replace(/0x[a-f0-9]{40,}/gi, '[address-or-key]').replace(/did:privy:[A-Za-z0-9_-]+/g, '[account-id]');
    const lines = diagnostic.split('\n').filter(line => line.trim() && !/logged in as|^welcome|user_id|userId|owner_id|ownerId|organization_id|organizationId|authorization_context/i.test(line));
    console.error(lines.slice(-6).join('\n').slice(0,1800) || 'No safe failure detail available.');
  }
  console.log(code === 0 && log ? `Actual CRE simulation result: scanned${log[1]}, accepted${log[2]}, stale${log[3]}; no payment receipt or deployment is inferred.` : code === 0 ? 'CRE CLI exited successfully; workflow result requires further verification.' : 'CRE_SIMULATION_FAILED; login/host/entitlement or adapter verification is required. No raw credentials logged.');
  process.exitCode = code;
} catch (error) {
  const allowed = ['EXPLICIT_AUTHORIZED_ORIGIN_REQUIRED', 'TRUSTED_HTTPS_ADAPTER_REQUIRED', 'CRE_ORIGIN_AUTHORIZATION_MISMATCH', 'CRE_RELAY_SECRET_REQUIRED', 'REBUILD_CRE_WASM_REQUIRED', 'ACTIVE_OWNED_RELAY_REQUIRED'];
  console.error(allowed.includes((error as Error).message) ? (error as Error).message : 'CRE_SIMULATION_PREFLIGHT_FAILED; no credentials forwarded.'); process.exitCode = 1;
}
