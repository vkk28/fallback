import { spawn, execFileSync } from 'node:child_process';
import { chmod, mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { approvedCreOrigin, creProcessEnvironment, relayOnlyEnvironment } from '../packages/backend/src/cre-simulation.js';

const root = fileURLToPath(new URL('../', import.meta.url)), directory = root + '.tools/cre-deployment/';
let stage = 'preflight';
try {
  const [flag, authorization, ...extra] = process.argv.slice(2);
  if (flag !== '--authorized-origin' || !authorization || extra.length) throw new Error('EXPLICIT_PRIVATE_DEPLOY_AUTHORIZATION_REQUIRED');
  const config = JSON.parse(await readFile(root + 'workflows/cre/config.staging.json', 'utf8'));
  const origin = approvedCreOrigin(config.apiOrigin, authorization);
  const settings = await readFile(root + 'workflows/cre/workflow.yaml', 'utf8');
  if (!settings.includes('deployment-registry: private')) throw new Error('PRIVATE_REGISTRY_REQUIRED');
  const simulation = JSON.parse(await readFile(root + 'docs/evidence/cre-simulation.json', 'utf8'));
  if (!simulation.workflowResultVerified || simulation.adapterOrigin !== origin) throw new Error('VERIFIED_CURRENT_SIMULATION_REQUIRED');
  const tunnel = JSON.parse(await readFile(root + '.tools/cre-staging/tunnel.json', 'utf8'));
  if (tunnel.origin !== origin || !Number.isSafeInteger(tunnel.pid)) throw new Error('OWNED_STAGING_RELAY_REQUIRED');
  const command = execFileSync('/bin/ps', ['-p', String(tunnel.pid), '-o', 'command='], { encoding: 'utf8' });
  if (!command.includes(root + '.tools/cloudflared/cloudflared') || !command.includes('--url http://127.0.0.1:3001')) throw new Error('OWNED_STAGING_RELAY_REQUIRED');
  const proof = await fetch(origin + '/health', { redirect: 'error', signal: AbortSignal.timeout(15000) }).then(r => r.json());
  if (proof.instance !== tunnel.instance) throw new Error('OWNED_STAGING_RELAY_REQUIRED');
  const wasm = root + 'workflows/cre/main.wasm', binary = await stat(wasm);
  for (const source of ['workflows/cre/main.ts', 'workflows/cre/handler.ts', 'packages/domain/src/scheduling.ts']) if ((await stat(root + source)).mtimeMs > binary.mtimeMs) throw new Error('REBUILD_CRE_WASM_REQUIRED');
  const env = parseEnv(await readFile(root + '.env', 'utf8'));
  process.umask(0o077); await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(directory + 'relay.env', relayOnlyEnvironment(env.CRE_RELAY_SECRET), { mode: 0o600 }); await chmod(directory + 'relay.env', 0o600);
  await writeFile(directory + 'secrets.yaml', 'secretsNames:\n  CRE_RELAY_SECRET:\n    - CRE_RELAY_SECRET\n', { mode: 0o600 });
  const base = ['-R', root, '-T', 'staging-settings', '-e', directory + 'relay.env', '--non-interactive'];
  async function run(args: string[], browserConsent = false) {
    let output = '';
    const globals = browserConsent ? base.filter(value => value !== '--non-interactive') : base;
    const child = spawn(root + '.tools/cre/cre_v1.37.0_darwin_arm64', [...globals, ...args], { cwd: directory, env: creProcessEnvironment(process.env), stdio: ['ignore', 'pipe', 'pipe'] });
    const capture = (chunk: Buffer) => { output = (output + chunk.toString()).slice(-15000); };
    child.stdout.on('data', capture); child.stderr.on('data', capture);
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child.kill(signal));
    const code = await new Promise<number>(resolve => { child.once('error', () => resolve(1)); child.once('exit', value => resolve(value ?? 1)); });
    if (code) {
      const classification = /deploy access|not.*approved|not.*entitled|permission.*denied|forbidden/i.test(output) ? 'PROVIDER_DEPLOY_ACCESS_REQUIRED' : /browser|OAuth|authorization|consent/i.test(output) ? 'PROVIDER_BROWSER_CONSENT_REQUIRED' : /already exists/i.test(output) ? 'EXISTING_SECRET_OR_WORKFLOW_REQUIRES_RECONCILIATION' : 'CRE_PRIVATE_OPERATION_FAILED';
      for (const value of Object.values(env).filter(value => value.length >= 8).sort((a,b) => b.length-a.length)) output = output.split(value).join('[configured-value]');
      output = output.replace(/Bearer\s+\S+|eyJ[A-Za-z0-9._-]+|0x[a-f0-9]{40,}/gi,'[authorization-or-address]').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[account-email]').replace(/\b[a-f0-9]{32,}\b/gi,'[id]');
      output = output.replace(/did:privy:[A-Za-z0-9_-]+|\b(?:user|org)_[A-Za-z0-9_-]+\b/g,'[account-id]');
      const safe = output.split('\n').filter(line => line.trim() && !/logged in as|^welcome|user_id|owner_id|organization_id|authorization_context|https:\/\/.*(?:authorize|oauth|callback|state=)/i.test(line));
      console.error(safe.slice(-4).join('\n').slice(0,1200));
      console.error(classification); return false;
    }
    return true;
  }
  let progress: { secretsStored?: boolean; deployCommandSucceeded?: boolean; origin?: string } = {};
  try { progress = JSON.parse(await readFile(directory + 'progress.json', 'utf8')); } catch { /* first authorized attempt */ }
  if (progress.origin && progress.origin !== origin) throw new Error('PREVIOUS_DEPLOYMENT_RECONCILIATION_REQUIRED');
  if (!progress.secretsStored) {
    stage = 'secret_storage';
    console.log('Authorized relay-only secret storage: complete the provider browser consent window if it opens.');
    if (!await run(['secrets', 'create', directory + 'secrets.yaml', '--secrets-auth', 'browser', '--yes', '--timeout', '5m'], true)) throw new Error('PRIVATE_OPERATION_BLOCKED');
    progress = { ...progress, origin, secretsStored: true }; await writeFile(directory + 'progress.json', JSON.stringify(progress), { mode: 0o600 });
  }
  if (!progress.deployCommandSucceeded) {
    stage = 'private_deploy';
    if (!await run(['workflow', 'deploy', root + 'workflows/cre', '--wasm', wasm, '--yes'])) throw new Error('PRIVATE_OPERATION_BLOCKED');
    progress.deployCommandSucceeded = true; await writeFile(directory + 'progress.json', JSON.stringify(progress), { mode: 0o600 });
  }
  const evidence = { observedAt: new Date().toISOString(), registry: 'private', adapterOrigin: origin, relayOnlySecretStored: !!progress.secretsStored, deployCommandSucceeded: !!progress.deployCommandSucceeded, deployedExecutionVerified: false, paidReceiptVerified: false, mainnetOrWalletKeyUsed: false };
  await writeFile(root + 'docs/evidence/cre-private-deployment.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log('Private deployment command completed; verify workflow identity/status and actual cron executions before claiming deployed functionality.');
} catch (error) {
  const allowed = ['EXPLICIT_PRIVATE_DEPLOY_AUTHORIZATION_REQUIRED', 'PRIVATE_REGISTRY_REQUIRED', 'VERIFIED_CURRENT_SIMULATION_REQUIRED', 'OWNED_STAGING_RELAY_REQUIRED', 'REBUILD_CRE_WASM_REQUIRED', 'PREVIOUS_DEPLOYMENT_RECONCILIATION_REQUIRED', 'PRIVATE_OPERATION_BLOCKED'];
  console.error(allowed.includes((error as Error).message) ? (error as Error).message : 'CRE_PRIVATE_PREFLIGHT_FAILED', stage, '; no raw credentials logged.'); process.exitCode = 1;
}
