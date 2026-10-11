import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chainClient } from '../packages/chain/src/client.js';
import { indexerQuery } from '../packages/backend/src/indexer.js';
import { indexerCoverage, indexerSyncSchema } from '../packages/domain/src/indexer.js';

// Deliberately pause only the marker-owned indexer; preserve all databases/volumes.
// Worker remains running. No wallet action, reset, rewind or reorg is performed.
const helper = fileURLToPath(new URL('./local-services.mjs', import.meta.url));
function service(operation: 'status' | 'stop' | 'start') {
  return JSON.parse(execFileSync(process.execPath, [helper, operation, 'indexer'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 20_000 }).trim());
}
async function snapshot() {
  const data = await indexerQuery(`query Preserve {
    FallbackSync(where: {chainId: {_eq: 10143}}, limit: 1) { chainId processedBlock sourceBlock eventsProcessed }
    Plan(order_by: {id: asc}, limit: 21) { id lifecycle own reserve used paid nextInstallment frozenFunding }
    Timeline(order_by: {id: asc}, limit: 501) { id }
    Supporter(order_by: {id: asc}, limit: 161) { id contribution frozenContribution prefix claimed entitlement }
    Terms(order_by: {id: asc}, limit: 21) { id accepted }
  }`, {});
  const rawSync = (data.FallbackSync as Record<string, unknown>[])[0];
  const sync = { ...indexerSyncSchema.parse({ chainId: rawSync?.chainId, processedBlock: rawSync?.processedBlock, sourceBlock: rawSync?.sourceBlock }), observedAt: new Date().toISOString() };
  assert.ok(Array.isArray(data.Plan) && data.Plan.length <= 20);
  assert.ok(Array.isArray(data.Timeline) && data.Timeline.length <= 500);
  assert.ok(Array.isArray(data.Supporter) && data.Supporter.length <= 160);
  assert.ok(Array.isArray(data.Terms) && data.Terms.length <= 20);
  const { FallbackSync: _watermark, ...entities } = data;
  return { sync, entities };
}
let stopped = false, stage = 'preflight';
try {
  assert.equal(process.env.CHAIN_ID, '10143');
  assert.equal(process.env.ENVIO_GRAPHQL_URL, 'http://127.0.0.1:8080/v1/graphql');
  const c = chainClient(); assert.equal(await c.client.getChainId(), 10143);
  assert.equal(service('status').managed, true);
  stage = 'owned_stop';
  stopped = true; // Also restore if the stop helper times out after signalling.
  const stop = service('stop');
  stage = 'owned_stop_response';
  console.log(JSON.stringify({ stage, stop }));
  assert.equal(stop.stopRequested, true);
  // The native indexer may finish its committed batch after the helper's 5s wait.
  let status = service('status');
  for (let i = 0; i < 60 && (status.managed || status.listening); i++) {
    await new Promise(resolve => setTimeout(resolve, 500)); status = service('status');
  }
  stage = 'owned_stop_wait';
  console.log(JSON.stringify({ stage, status }));
  assert.equal(status.managed, false); assert.equal(status.listening, false);
  const before = await snapshot();
  const startHead = await c.client.getBlock();
  stage = 'controlled_lag';
  let duringHead = startHead;
  for (let i = 0; i < 20 && duringHead.number <= startHead.number; i++) {
    await new Promise(resolve => setTimeout(resolve, 500)); duringHead = await c.client.getBlock();
  }
  assert.ok(duringHead.number > startHead.number);
  const during = await snapshot();
  assert.equal(during.sync.processedBlock, before.sync.processedBlock);
  assert.deepEqual(during.entities, before.entities);
  assert.equal(indexerCoverage(during.sync, duringHead.number.toString()), 'behind');
  stage = 'owned_restart';
  assert.equal(service('start').managed, true);
  for (let i = 0; i < 60 && !service('status').listening; i++) await new Promise(resolve => setTimeout(resolve, 500));
  assert.equal(service('status').listening, true);
  stage = 'preserved_state';
  let after = await snapshot();
  for (let i = 0; i < 240 && BigInt(after.sync.processedBlock) <= BigInt(before.sync.processedBlock); i++) {
    await new Promise(resolve => setTimeout(resolve, 500)); after = await snapshot();
  }
  stage = 'restart_progress';
  console.log(JSON.stringify({ stage, before: before.sync.processedBlock, after: after.sync.processedBlock, entitiesUnchanged: JSON.stringify(after.entities) === JSON.stringify(before.entities) }));
  assert.ok(BigInt(after.sync.processedBlock) > BigInt(before.sync.processedBlock));
  stage = 'entities_preserved';
  assert.deepEqual(after.entities, before.entities);
  const evidence = { observedAt: new Date().toISOString(), scope: 'Actual owned Envio stop/start with preserved local DB and private Hasura; real chain advances during pause', controlledLag: 'passed: processing height frozen while RPC head advances; coverage reports behind', restart: 'passed: processing resumes without duplicate or lost existing entities', processedBefore: before.sync.processedBlock, processedAfter: after.sync.processedBlock, rpcHeadBeforePauseObservation: startHead.number.toString(), rpcHeadDuringPause: duringHead.number.toString(), preservedPlans: (before.entities.Plan as unknown[]).length, preservedTimelineEvents: (before.entities.Timeline as unknown[]).length, reorgRollbackTested: false, walletSigningOrSubmission: false };
  await writeFile('docs/evidence/indexer-restart-lag.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence));
} catch {
  console.error(`INDEXER_RESTART_VERIFICATION_FAILED ${stage}; no raw errors or private identifiers logged.`);
  process.exitCode = 1;
} finally {
  if (stopped) {
    try { assert.equal(service('start').managed, true); }
    catch { console.error('INDEXER_RESTORE_REQUIRED: owned service startup failed; private data preserved.'); process.exitCode = 1; }
  }
}
