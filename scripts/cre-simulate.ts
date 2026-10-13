import { spawn, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { chmod, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { approvedCreOrigin, creProcessEnvironment, relayOnlyEnvironment, creSimulationArguments, creSimulationOutcome } from '../packages/backend/src/cre-simulation.js';

const root = fileURLToPath(new URL('../', import.meta.url));
try {
  const { authorization, requireWork } = creSimulationArguments(process.argv.slice(2));
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
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => child.kill(signal));
  const code = await new Promise<number>(resolve => { child.once('error', () => resolve(1)); child.once('exit', value => resolve(value ?? 1)); });
  const outcome = creSimulationOutcome(diagnostic, code, requireWork);
  const evidence = { observedAt: new Date().toISOString(), adapterOrigin: origin, environmentVariablesForwarded: ['CRE_RELAY_SECRET'], productionLimits: 'default', prebuiltWasm: true, cliExitCode: code, requireWork, workflowResultVerified: outcome.workflowResultVerified, usefulWorkVerified: outcome.usefulWorkVerified, result: outcome.result, deploymentPerformed: false, verifiedPaymentReceipt: false };
  // Keep every sanitized observation. A later empty scan or failure must not erase
  // the evidence of a useful run. No raw CLI/account/HTTP output is archived.
  await mkdir(directory + 'runs/', { recursive: true, mode: 0o700 });
  const serializedEvidence = JSON.stringify(evidence, null, 2) + '\n';
  await writeFile(directory + `runs/${randomUUID()}.json`, serializedEvidence, { mode: 0o600, flag: 'wx' });
  await writeFile(root + 'docs/evidence/cre-simulation.json', serializedEvidence);
  if (code !== 0) {
    // Only sanitized failure lines; never persist raw CLI/account/HTTP logs.
    for (const value of Object.values(env).filter((value): value is string => typeof value === 'string' && value.length >= 8).sort((a, b) => b.length - a.length)) diagnostic = diagnostic.split(value).join('[configured-value]');
    diagnostic = diagnostic.replace(/Bearer\s+\S+|eyJ[A-Za-z0-9._-]+/g, '[authorization]').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[account-email]').replace(/\b(?:user|org|did)_[A-Za-z0-9_-]+\b/g, '[account-id]').replace(/\b[a-f0-9]{32,}\b/gi, '[id]');
    diagnostic = diagnostic.replace(/0x[a-f0-9]{40,}/gi, '[address-or-key]').replace(/did:privy:[A-Za-z0-9_-]+/g, '[account-id]');
    const lines = diagnostic.split('\n').filter(line => line.trim() && !/logged in as|^welcome|user_id|userId|owner_id|ownerId|organization_id|organizationId|authorization_context/i.test(line));
    console.error(lines.slice(-6).join('\n').slice(0,1800) || 'No safe failure detail available.');
  }
  if (outcome.workflowResultVerified && outcome.result) console.log(`Actual CRE simulation result: scanned ${outcome.result.scanned}, accepted ${outcome.result.accepted}, stale ${outcome.result.stale}; useful enqueue ${outcome.usefulWorkVerified ? 'verified' : 'not observed'}. No payment receipt or deployment is inferred.`);
  else console.error(code === 0 ? 'CRE_WORKFLOW_RESULT_UNVERIFIED; CLI exit alone is insufficient.' : 'CRE_SIMULATION_FAILED; login/host/entitlement or adapter verification is required. No raw credentials logged.');
  if (requireWork && outcome.workflowResultVerified && !outcome.usefulWorkVerified) console.error('CRE_ELIGIBLE_WORK_REQUIRED; no useful enqueue was observed. Preserve consented terms and run again when work is eligible.');
  process.exitCode = outcome.exitCode;
} catch (error) {
  const allowed = ['EXPLICIT_AUTHORIZED_ORIGIN_REQUIRED', 'TRUSTED_HTTPS_ADAPTER_REQUIRED', 'CRE_ORIGIN_AUTHORIZATION_MISMATCH', 'CRE_RELAY_SECRET_REQUIRED', 'REBUILD_CRE_WASM_REQUIRED', 'ACTIVE_OWNED_RELAY_REQUIRED'];
  console.error(allowed.includes((error as Error).message) ? (error as Error).message : 'CRE_SIMULATION_PREFLIGHT_FAILED; no credentials forwarded.'); process.exitCode = 1;
}
