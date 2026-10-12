import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import postgres from 'postgres';
import { privateKeyToAddress } from 'viem/accounts';
import { getAddress, type Hex } from 'viem';
import { chainClient, registeredPlan } from '../packages/chain/src/client.js';
import { discover, discoverIndexed } from '../apps/worker/src/gateway.js';
import { FallbackPlanAbi } from '../packages/chain/src/FallbackPlan.js';

// Existing-app readiness only: no signing, submission, jobs, metadata or identity
// exports. Fail if the preserved original plan or completed A/B state has changed.
let stage = 'configuration';
const url = new URL(process.env.DATABASE_URL || '');
assert.equal(url.hostname, '127.0.0.1'); assert.equal(url.port, '54329'); assert.equal(url.pathname, '/fallback');
assert.equal(process.env.CHAIN_ID, '10143');
const db = postgres(url.toString(), { max: 1 });
try {
  const before = (await db`SELECT count(*)::int AS n FROM transaction_requests`)[0]!.n;
  const rows = await db`SELECT id,label,address FROM plans WHERE address IS NOT NULL ORDER BY created_at`;
  assert.equal(rows.length, 3, 'REVIEW_CHANGED_REGISTRY_SCOPE');
  const reports = [];
  for (const row of rows) {
    stage = 'preserved_plan';
    const configured = await registeredPlan(String(row.address));
    const block = await configured.client.getBlock();
    const read = <N extends 'lifecycle' | 'terms' | 'recipientAllocated' | 'reserveRemaining' | 'totalPaid' | 'supportUsed' | 'preview'>(functionName: N) => {
      stage = `plan_read_${functionName}`;
      return configured.client.readContract({ address: configured.plan, abi: FallbackPlanAbi, functionName, blockNumber: block.number });
    };
    // This maintenance check needs only these fields. Read sequentially instead
    // of fetching every share/outcome and issuing a broad RPC burst per role.
    const current = { lifecycle: await read('lifecycle'), own: await read('recipientAllocated'), reserve: await read('reserveRemaining'), totalPaid: await read('totalPaid'), used: await read('supportUsed'), terms: await read('terms'), preview: await read('preview'), block: block.number };
    const count = (await db`SELECT count(*)::int AS n FROM transaction_requests WHERE plan_id=${row.id}`)[0]!.n;
    if (row.label === 'Manual B - refunds') {
      stage = 'manual_b_assertions';
      assert.equal(current.lifecycle, 2); assert.equal(count, 15);
      assert.equal(current.own, 0n); assert.equal(current.reserve, 0n); assert.equal(current.totalPaid, 0n); assert.equal(current.used, 0n);
      const people = await db`SELECT a.address FROM memberships m JOIN accounts a ON a.id=m.user_id WHERE m.plan_id=${row.id}`;
      stage = 'manual_b_claims';
      for (const person of people) assert.equal(await chainClient().client.readContract({ address: getAddress(String(row.address)), abi: FallbackPlanAbi, functionName: 'claimable', args: [getAddress(String(person.address))], blockNumber: current.block }), 0n);
      reports.push({ scenario: 'Manual B', lifecycle: 'Closed', remainingClaims: '0', requests: count });
    } else if (current.lifecycle === 1) {
      stage = 'original_requests';
      assert.equal(count, 12);
      stage = 'original_preview';
      assert.equal(current.terms.amount, 150000000n); assert.equal(current.terms.count, 3);
      assert.equal(current.totalPaid % current.terms.amount, 0n);
      assert.ok(current.totalPaid <= current.terms.amount * BigInt(current.terms.count));
      const ownPaid = current.totalPaid < 250000000n ? current.totalPaid : 250000000n;
      assert.equal(current.own, 250000000n - ownPaid);
      assert.equal(current.used, current.totalPaid - ownPaid);
      assert.equal(current.reserve + current.used, 300000000n);
      const outcomes = [];
      for (let i = 0; i < current.terms.count; i++) outcomes.push(await configured.client.readContract({ address: configured.plan, abi: FallbackPlanAbi, functionName: 'outcomes', args: [i], blockNumber: current.block }));
      assert.equal(outcomes.filter(o => o === 1).length, Number(current.totalPaid / current.terms.amount));
      assert.ok(outcomes.slice(0, current.preview.index).every(o => o !== 0));
      assert.ok(outcomes.slice(current.preview.index).every(o => o === 0));
      assert.equal(new Date(Number(current.terms.firstDue) * 1000).toISOString(), '2026-10-11T22:18:00.000Z');
      reports.push({ scenario: 'Original', lifecycle: 'Active', own: current.own.toString(), reserve: current.reserve.toString(), paid: current.totalPaid.toString(), used: current.used.toString(), requests: count, firstDueUtc: '2026-10-11T22:18:00Z', nextInstallment: current.preview.index, previewReason: current.preview.reason, outcomes });
    } else {
      stage = 'closed_plan_assertions';
      assert.equal(current.lifecycle, 2); assert.equal(current.own, 0n); assert.equal(current.reserve, 0n);
      reports.push({ scenario: 'Manual A', lifecycle: 'Closed', remainingAllocation: '0', reserve: '0', requests: count });
    }
  }
  stage = 'scenario_scope';
  assert.equal(reports.filter(r => r.scenario === 'Original').length, 1);
  assert.equal(reports.filter(r => r.scenario === 'Manual B').length, 1);
  stage = 'discovery';
  const registry = await discover(0), indexed = await discoverIndexed(null);
  assert.equal(indexed.scanned, 3); assert.equal(indexed.nextCursor, null);
  // Discovery can legitimately find due work as time advances. Compare identities
  // rather than preserving the obsolete assumption that every scan is empty.
  const identities = (rows: typeof registry) => rows.map(c => `${c.chainId}:${c.plan.toLowerCase()}:${c.installment}:${c.action}`).sort();
  assert.deepEqual(identities(registry), identities(indexed.candidates));
  stage = 'readiness';
  const c = chainClient(); assert.equal(await c.client.getChainId(), 10143);
  const workerKey = process.env.WORKER_PRIVATE_KEY; assert.ok(workerKey && /^0x[0-9a-f]{64}$/i.test(workerKey));
  const workerGasAvailable = await c.client.getBalance({ address: privateKeyToAddress(workerKey as Hex) }) > 0n;
  assert.equal(workerGasAvailable, true);
  const originArg = process.argv.indexOf('--app-origin');
  const origin = new URL(originArg >= 0 ? process.argv[originArg + 1]! : process.env.APP_ORIGIN || 'http://localhost:3000');
  assert.ok(origin.origin === 'https://fallbackk.netlify.app' || origin.origin === 'http://localhost:3000');
  const health = await (await fetch(`${origin.origin}/api/health`, { redirect: 'error', signal: AbortSignal.timeout(15_000) })).json();
  assert.equal(health.databaseReady, true); assert.equal(health.rpcReady, true);
  const unresolved = (await db`SELECT count(*)::int AS n FROM transaction_requests WHERE status NOT IN ('confirmed','failed')`)[0]!.n;
  assert.equal(unresolved, 0);
  const jobs = await db`SELECT status,count(*)::int AS count FROM settlement_jobs GROUP BY status ORDER BY status`;
  const after = (await db`SELECT count(*)::int AS n FROM transaction_requests`)[0]!.n;
  assert.equal(before, after);
  const evidence = { observedAt: new Date().toISOString(), chainId: 10143, scope: 'Read-only existing application/chain/accounting/discovery readiness; no signing, submission or enqueue', plans: reports, registryCandidates: registry.length, indexedPlansScanned: indexed.scanned, indexedCandidates: indexed.candidates.length, workerGasAvailable, unresolvedAccountRequests: unresolved, jobs, databaseReady: health.databaseReady, rpcReady: health.rpcReady, requestCountBefore: before, requestCountAfter: after, duePaymentVerified: false };
  await writeFile('docs/evidence/functionality-readiness.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence));
} catch (error) {
  const category = error instanceof Error && ['AssertionError', 'ContractFunctionExecutionError', 'HttpRequestError', 'TimeoutError'].includes(error.name) ? error.name : 'unclassified';
  console.error(`FUNCTIONALITY_VERIFICATION_FAILED ${stage} ${category}; no private identifiers or raw errors logged.`); process.exitCode = 1;
}
finally { await db.end(); }
