import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPublicClient, createWalletClient, defineChain, getAddress, http, parseEventLogs, toHex, zeroHash } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '../packages/backend/src/schema.js';
import { FallbackFactoryAbi } from '../packages/chain/src/FallbackFactory.js';
import { FallbackPlanAbi } from '../packages/chain/src/FallbackPlan.js';
import { FallbackTestTokenAbi } from '../packages/chain/src/FallbackTestToken.js';
import { workerGateway, discover } from '../apps/worker/src/gateway.js';
import { enqueue, processOne } from '../apps/worker/src/jobs.js';
import { foundryBinary } from './foundry-binary.mjs';

const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
const bound = server.address(); if (!bound || typeof bound === 'string') throw new Error('No test port');
const port = bound.port; await new Promise<void>(resolve => server.close(() => resolve()));
const node = spawn(foundryBinary('anvil'), ['--silent', '--host', '127.0.0.1', '--port', String(port), '--chain-id', '31337'], { stdio: 'ignore' });
const exited = once(node, 'exit');
const directory = await mkdtemp(join(tmpdir(), 'fallback-worker-chain-'));
let pg = new PGlite(directory), db = drizzle(pg, { schema });
const old = Object.fromEntries(['CHAIN_ID', 'MONAD_RPC_URL', 'FACTORY_ADDRESS', 'TOKEN_ADDRESS', 'WORKER_PRIVATE_KEY'].map(k => [k, process.env[k]]));
try {
  const rpc = `http://127.0.0.1:${port}`;
  const chain = defineChain({ id: 31337, name: 'Disposable worker-test Anvil', nativeCurrency: { name: 'Test ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [rpc] } } });
  const client = createPublicClient({ chain, cacheTime: 0, pollingInterval: 50, transport: http(rpc, { retryCount: 0 }) });
  for (let i = 0; i < 100; i++) { try { await client.getChainId(); break; } catch { await new Promise(r => setTimeout(r, 50)); } }
  const wallet = (addressIndex: number) => createWalletClient({ chain, transport: http(rpc), account: mnemonicToAccount('test test test test test test test test test test test junk', { addressIndex }) });
  const owner = wallet(0), payee = wallet(1), supporter = wallet(2), worker = wallet(3);
  const tokenArtifact = JSON.parse(await readFile('contracts/out/FallbackTestToken.sol/FallbackTestToken.json', 'utf8'));
  const factoryArtifact = JSON.parse(await readFile('contracts/out/FallbackFactory.sol/FallbackFactory.json', 'utf8'));
  const wait = async (hash: `0x${string}`) => { const r = await client.waitForTransactionReceipt({ hash }); assert.equal(r.status, 'success'); return r; };
  const tokenReceipt = await wait(await owner.deployContract({ abi: FallbackTestTokenAbi, bytecode: tokenArtifact.bytecode.object }));
  const token = getAddress(tokenReceipt.contractAddress!);
  const factoryReceipt = await wait(await owner.deployContract({ abi: FallbackFactoryAbi, bytecode: factoryArtifact.bytecode.object, args: [token] }));
  const factory = getAddress(factoryReceipt.contractAddress!);
  const now = (await client.getBlock()).timestamp;
  const terms = { amount: 150_000_000n, minimumReserve: 1_000_000n, maximumReserve: 300_000_000n, perPaymentCap: 150_000_000n, firstDue: now + 1000n, interval: 1000n, grace: 100n, fundingDeadline: now + 800n, coverBps: 10_000, count: 1, metadataCommitment: zeroHash };
  const expires = now + 700n;
  const hash = await client.readContract({ address: factory, abi: FallbackFactoryAbi, functionName: 'proposalHash', args: [owner.account.address, payee.account.address, terms, 0n, expires] });
  await wait(await owner.writeContract({ address: factory, abi: FallbackFactoryAbi, functionName: 'propose', args: [payee.account.address, terms, expires] }));
  await wait(await payee.writeContract({ address: factory, abi: FallbackFactoryAbi, functionName: 'accept', args: [hash] }));
  const created = await wait(await owner.writeContract({ address: factory, abi: FallbackFactoryAbi, functionName: 'publish', args: [payee.account.address, terms, 0n, expires] }));
  const plan = parseEventLogs({ abi: FallbackFactoryAbi, eventName: 'PlanCreated', logs: created.logs })[0]!.args.plan;
  for (const [w, amount, own] of [[owner, 100_000_000n, true], [supporter, 300_000_000n, false]] as const) {
    await wait(await owner.writeContract({ address: token, abi: FallbackTestTokenAbi, functionName: 'mint', args: [w.account.address, amount] }));
    await wait(await w.writeContract({ address: token, abi: FallbackTestTokenAbi, functionName: 'approve', args: [plan, amount] }));
    await wait(await w.writeContract({ address: plan, abi: FallbackPlanAbi, functionName: own ? 'addOwn' : 'contribute', args: [amount] }));
  }
  await wait(await owner.writeContract({ address: plan, abi: FallbackPlanAbi, functionName: 'activate' }));
  await client.request({ method: 'evm_setNextBlockTimestamp' as never, params: [Number(terms.firstDue)] as never });
  await client.request({ method: 'evm_mine' as never });
  process.env.CHAIN_ID = '31337'; process.env.MONAD_RPC_URL = rpc; process.env.FACTORY_ADDRESS = factory; process.env.TOKEN_ADDRESS = token;
  const key = worker.account.getHdKey().privateKey; assert.ok(key); process.env.WORKER_PRIVATE_KEY = toHex(key);
  await migrate(db, { migrationsFolder: 'infra/migrations' });
  const id = randomUUID();
  for (const [i, w] of [owner, payee, supporter].entries()) await db.insert(schema.accounts).values({ id: `fixture:${i}`, address: w.account.address.toLowerCase() });
  await db.insert(schema.plans).values({ id, ownerId: 'fixture:0', label: 'Local worker fixture', payee: payee.account.address.toLowerCase(), terms: {}, salt: 'local-fixture', chainId: 31337, address: plan.toLowerCase() });
  for (const [i, role] of ['recipient', 'payee', 'supporter'].entries()) await db.insert(schema.memberships).values({ planId: id, userId: `fixture:${i}`, role: role as 'recipient' | 'payee' | 'supporter' });
  const candidates = await discover(0); assert.equal(candidates.length, 1);
  await enqueue(db, candidates[0]!);
  let signs = 0, broadcasts = 0;
  const trackedGateway = () => {
    const gateway = workerGateway(db);
    return { ...gateway, prepare: async (...args: Parameters<typeof gateway.prepare>) => { signs++; return gateway.prepare(...args); }, broadcast: async (serialized: Parameters<typeof gateway.broadcast>[0]) => { broadcasts++; return gateway.broadcast(serialized); } };
  };
  const processAt = new Date(Date.now() + 1000);
  // Persist a real signed call, then lose RPC before the first broadcast. Reopen
  // SQL to exercise a process crash in the exact former lost-hash window.
  await processOne(db, { ...trackedGateway(), receipt: async () => { throw new Error('INJECTED_RECEIPT_OUTAGE'); } }, processAt);
  let job = await db.query.jobs.findFirst(); assert.equal(job?.status, 'submitted'); assert.ok(job.transactionHash);
  const submittedHash = job.transactionHash as `0x${string}`;
  assert.ok(job.signedTransaction); assert.equal(broadcasts, 0); assert.equal(signs, 1);
  assert.equal((await db.select().from(schema.notifications)).length, 0);
  await pg.close(); pg = new PGlite(directory); db = drizzle(pg, { schema });
  assert.equal((await db.query.jobs.findFirst())?.transactionHash, submittedHash);
  const lostResponse = trackedGateway();
  await processOne(db, { ...lostResponse, broadcast: async raw => { await lostResponse.broadcast(raw); throw new Error('INJECTED_BROADCAST_RESPONSE_LOSS'); }, receipt: async () => 'pending' }, new Date(processAt.getTime() + 3000));
  await wait(submittedHash);
  assert.equal(signs, 1); assert.equal(broadcasts, 1);
  assert.equal((await db.query.jobs.findFirst())?.transactionHash, submittedHash);
  assert.equal((await db.select().from(schema.notifications)).length, 0);
  await pg.close(); pg = new PGlite(directory); db = drizzle(pg, { schema });
  const interrupted = trackedGateway();
  // Actual receipt-backed messages persist, then acknowledgement is interrupted.
  await processOne(db, { ...interrupted, notify: async (plan, hash) => { await interrupted.notify(plan, hash); throw new Error('INJECTED_NOTIFICATION_ACK_OUTAGE'); } }, new Date(processAt.getTime() + 9000));
  assert.equal((await db.query.jobs.findFirst())?.status, 'submitted');
  assert.equal((await db.select().from(schema.notifications)).length, 6);
  await pg.close(); pg = new PGlite(directory); db = drizzle(pg, { schema });
  const gateway = trackedGateway();
  await processOne(db, gateway, new Date(processAt.getTime() + 20_000));
  job = await db.query.jobs.findFirst(); assert.equal(job?.status, 'confirmed'); assert.equal(job.transactionHash, submittedHash);
  assert.equal(signs, 1); assert.equal(broadcasts, 1);
  assert.equal(await client.readContract({ address: token, abi: FallbackTestTokenAbi, functionName: 'balanceOf', args: [payee.account.address] }), 150_000_000n);
  const messages = await db.select().from(schema.notifications); assert.equal(messages.length, 6);
  await gateway.notify(plan, job.transactionHash as `0x${string}`); assert.equal((await db.select().from(schema.notifications)).length, 6);
  await writeFile('docs/evidence/local-worker-verification.json', JSON.stringify({ runtime: 'actual Anvil transactions + actual worker gateway + persistent SQL fixture reopened three times', chainId: 31337, discovery: 'passed', job: job.status, hash: job.transactionHash, delivered: '150000000', idempotentNotifications: 6, actualSubmissions: broadcasts, signaturesPrepared: signs, restartRecovery: 'passed: persisted signed call and hash survive three SQL reopenings', injectedPreBroadcastCrash: 'passed: stored hash exists before any broadcast', injectedBroadcastResponseLoss: 'passed: same hash recovers without resigning or another submission', injectedReceiptOutage: 'passed: no notification before successful receipt reconciliation', injectedNotificationAckOutage: 'passed: receipt-backed messages survive restart without duplicates', realPrivySessions: false, observedAt: new Date().toISOString() }, null, 2));
  console.log('Actual worker gateway verified: one settlement, durable signing before broadcast, lost broadcast response and notification recovery across three SQL restarts.');
} finally {
  for (const [k, value] of Object.entries(old)) { if (value === undefined) delete process.env[k]; else process.env[k] = value; }
  await pg.close(); await rm(directory, { recursive: true, force: true }); node.kill('SIGTERM'); await exited;
}
