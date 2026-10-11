import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import postgres from 'postgres';
import { createPublicClient, createWalletClient, defineChain, http, parseEventLogs, zeroHash } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { FallbackFactoryAbi } from '../packages/chain/src/FallbackFactory.js';
import { FallbackPlanAbi } from '../packages/chain/src/FallbackPlan.js';
import { FallbackTestTokenAbi } from '../packages/chain/src/FallbackTestToken.js';
import { foundryBinary } from './foundry-binary.mjs';

// Actual Envio runtime + disposable PostgreSQL database + disposable Anvil fork.
// No production config, local services, testnet plans or preserved DBs are changed.
const root = fileURLToPath(new URL('../', import.meta.url));
process.umask(0o077);
const configured = new URL(process.env.DATABASE_URL || '');
assert.equal(configured.hostname, '127.0.0.1'); assert.equal(configured.port, '54329');
configured.pathname = '/postgres';
const admin = postgres(configured.toString(), { max: 1 });
const name = `fallback_reorg_${randomBytes(6).toString('hex')}`;
await admin.unsafe(`CREATE DATABASE "${name}"`);
configured.pathname = '/' + name;
const db = postgres(configured.toString(), { max: 1 });
await mkdir(join(root, '.tools/reorg'), { recursive: true, mode: 0o700 });
const directory = await mkdtemp(join(root, '.tools/reorg/run-'));
async function freePort() {
  const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  await new Promise<void>(resolve => server.close(() => resolve())); return address.port;
}
const port = await freePort(), metrics = await freePort();
const node = spawn(foundryBinary('anvil'), ['--silent', '--host', '127.0.0.1', '--port', String(port), '--chain-id', '31337'], { stdio: 'ignore' });
const nodeExit = once(node, 'exit');
let indexer: ReturnType<typeof spawn> | undefined, stage = 'local_chain';
let indexerExit: Promise<unknown> | undefined;
let diagnostic = '';
try {
  const rpc = `http://127.0.0.1:${port}`;
  const chain = defineChain({ id: 31337, name: 'Disposable reorg verification', nativeCurrency: { name: 'Test ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [rpc] } } });
  const client = createPublicClient({ chain, cacheTime: 0, transport: http(rpc, { retryCount: 0 }), pollingInterval: 50 });
  for (let i = 0; i < 100; i++) { try { await client.getChainId(); break; } catch { await new Promise(r => setTimeout(r, 50)); } }
  const wallet = (addressIndex: number) => createWalletClient({ chain, transport: http(rpc), account: mnemonicToAccount('test test test test test test test test test test test junk', { addressIndex }) });
  const owner = wallet(0), payee = wallet(1), supporter = wallet(2);
  const wait = async (hash: `0x${string}`) => { const receipt = await client.waitForTransactionReceipt({ hash }); assert.equal(receipt.status, 'success'); return receipt; };
  const tokenArtifact = JSON.parse(await readFile(join(root, 'contracts/out/FallbackTestToken.sol/FallbackTestToken.json'), 'utf8'));
  const factoryArtifact = JSON.parse(await readFile(join(root, 'contracts/out/FallbackFactory.sol/FallbackFactory.json'), 'utf8'));
  const token = (await wait(await owner.deployContract({ abi: FallbackTestTokenAbi, bytecode: tokenArtifact.bytecode.object }))).contractAddress!;
  const factory = (await wait(await owner.deployContract({ abi: FallbackFactoryAbi, bytecode: factoryArtifact.bytecode.object, args: [token] }))).contractAddress!;
  const now = (await client.getBlock()).timestamp;
  const terms = { amount: 1000000n, minimumReserve: 1000000n, maximumReserve: 2000000n, perPaymentCap: 1000000n, firstDue: now + 1000n, interval: 1000n, grace: 100n, fundingDeadline: now + 800n, count: 1, coverBps: 10000, metadataCommitment: zeroHash };
  const expires = now + 700n;
  const proposal = await client.readContract({ address: factory, abi: FallbackFactoryAbi, functionName: 'proposalHash', args: [owner.account.address, payee.account.address, terms, 0n, expires] });
  await wait(await owner.writeContract({ address: factory, abi: FallbackFactoryAbi, functionName: 'propose', args: [payee.account.address, terms, expires] }));
  await wait(await payee.writeContract({ address: factory, abi: FallbackFactoryAbi, functionName: 'accept', args: [proposal] }));
  const creation = await wait(await owner.writeContract({ address: factory, abi: FallbackFactoryAbi, functionName: 'publish', args: [payee.account.address, terms, 0n, expires] }));
  const plan = parseEventLogs({ abi: FallbackFactoryAbi, eventName: 'PlanCreated', logs: creation.logs })[0]!.args.plan;
  for (const w of [owner, supporter]) {
    await wait(await owner.writeContract({ address: token, abi: FallbackTestTokenAbi, functionName: 'mint', args: [w.account.address, 2000000n] }));
    await wait(await w.writeContract({ address: token, abi: FallbackTestTokenAbi, functionName: 'approve', args: [plan, 2000000n] }));
  }
  const snapshot = await client.request({ method: 'evm_snapshot' as never });
  const config = { name: 'fallback-reorg-test', handlers: 'handlers', rollback_on_reorg: true, save_full_history: true, field_selection: { transaction_fields: ['hash'] }, chains: [{ id: 31337, start_block: 0, max_reorg_depth: 100, block_lag: 0, rpc: { url: rpc, for: 'sync', initial_block_interval: 10, interval_ceiling: 10 }, contracts: [
    { name: 'FallbackFactory', abi_file_path: join(root, 'indexer/abis/FallbackFactory.json'), address: factory, events: FallbackFactoryAbi.filter(e => e.type === 'event').map(e => ({ event: e.name })) },
    { name: 'FallbackPlan', abi_file_path: join(root, 'indexer/abis/FallbackPlan.json'), events: FallbackPlanAbi.filter(e => e.type === 'event').map(e => ({ event: e.name })) },
  ] }] };
  await writeFile(join(directory, 'config.yaml'), JSON.stringify(config));
  await writeFile(join(directory, 'schema.graphql'), await readFile(join(root, 'indexer/schema.graphql')));
  await mkdir(join(directory, 'handlers'));
  await writeFile(join(directory, 'handlers/events.ts'), `import ${JSON.stringify(join(root, 'indexer/src/handlers/events.ts'))};\n`);
  const env = { PATH: process.env.PATH!, HOME: process.env.HOME!, ENVIO_PG_HOST: '127.0.0.1', ENVIO_PG_PORT: '54329', ENVIO_PG_USER: decodeURIComponent(configured.username), ENVIO_PG_PASSWORD: decodeURIComponent(configured.password), ENVIO_PG_DATABASE: name, ENVIO_PG_SCHEMA: 'public', ENVIO_PG_SSL_MODE: 'false', ENVIO_HASURA: 'false', ENVIO_TUI: 'false', ENVIO_INDEXER_PORT: String(metrics), NODE_ENV: 'development', NODE_OPTIONS: `--import=${root}scripts/indexer-loopback.mjs` };
  const cli = join(root, 'node_modules/envio/bin.mjs');
  async function run(args: string[]) {
    const child = spawn(process.execPath, [cli, '-d', directory, ...args], { cwd: root, env, stdio: 'ignore' });
    const [code] = await once(child, 'exit'); assert.equal(code, 0, 'DISPOSABLE_INDEXER_TOOL_FAILED');
  }
  stage = 'codegen'; await run(['codegen']); stage = 'migration'; await run(['local', 'db-migrate', 'up']);
  stage = 'indexer_start';
  indexer = spawn(process.execPath, [cli, '-d', directory, 'start'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [indexer.stdout, indexer.stderr]) stream?.on('data', chunk => { diagnostic = (diagnostic + String(chunk)).slice(-16000); });
  indexerExit = once(indexer, 'exit');
  async function eventually(check: () => Promise<boolean>) {
    const deadline = Date.now() + 45000;
    while (Date.now() < deadline) {
      if (indexer?.exitCode !== null) throw new Error('DISPOSABLE_INDEXER_EXITED');
      if (await check()) return;
      await new Promise(r => setTimeout(r, 200));
    }
    throw new Error('DISPOSABLE_INDEXER_TIMEOUT');
  }
  const id = `31337:${plan.toLowerCase()}`;
  await eventually(async () => (await db`SELECT 1 FROM "Plan" WHERE id=${id}`).length === 1);
  stage = 'orphan_branch';
  const orphan = await wait(await owner.writeContract({ address: plan, abi: FallbackPlanAbi, functionName: 'addOwn', args: [500000n] }));
  await wait(await supporter.writeContract({ address: plan, abi: FallbackPlanAbi, functionName: 'contribute', args: [1000000n] }));
  await wait(await owner.writeContract({ address: plan, abi: FallbackPlanAbi, functionName: 'activate' }));
  await client.request({ method: 'evm_setNextBlockTimestamp' as never, params: [Number(terms.firstDue)] as never });
  await client.request({ method: 'evm_mine' as never });
  await wait(await owner.writeContract({ address: plan, abi: FallbackPlanAbi, functionName: 'settleNext' }));
  await eventually(async () => (await db`SELECT lifecycle,paid FROM "Plan" WHERE id=${id}`)[0]?.paid === '1000000');
  assert.equal((await db`SELECT count(*)::int AS n FROM "Installment"`)[0]?.n, 1);
  const before = (await db`SELECT count(*)::int AS n FROM "Timeline"`)[0]!.n;
  stage = 'canonical_fork';
  assert.equal(await client.request({ method: 'evm_revert' as never, params: [snapshot] as never }), true);
  await client.request({ method: 'evm_setNextBlockTimestamp' as never, params: [Number(now + 30n)] as never });
  const canonical = await wait(await owner.writeContract({ address: plan, abi: FallbackPlanAbi, functionName: 'addOwn', args: [750000n], nonce: await client.getTransactionCount({ address: owner.account.address, blockTag: 'pending' }) }));
  assert.equal(orphan.blockNumber, canonical.blockNumber); assert.notEqual(orphan.blockHash, canonical.blockHash);
  await client.request({ method: 'anvil_mine' as never, params: ['0xa'] as never });
  stage = 'rollback';
  await eventually(async () => {
    const [p] = await db`SELECT own,reserve,paid,used,lifecycle FROM "Plan" WHERE id=${id}`;
    return p?.own === '750000' && p.reserve === '0' && p.paid === '0' && p.used === '0' && p.lifecycle === 'Open';
  });
  assert.equal((await db`SELECT count(*)::int AS n FROM "Supporter"`)[0]?.n, 0);
  assert.equal((await db`SELECT count(*)::int AS n FROM "Installment"`)[0]?.n, 0);
  assert.equal((await db`SELECT count(*)::int AS n FROM "Timeline" WHERE "transactionHash"=${orphan.transactionHash}`)[0]?.n, 0);
  assert.equal((await db`SELECT count(*)::int AS n FROM "Timeline" WHERE "transactionHash"=${canonical.transactionHash}`)[0]?.n, 1);
  const after = (await db`SELECT count(*)::int AS n FROM "Timeline"`)[0]!.n;
  assert.equal(after, 4); assert.ok(before > after);
  assert.equal(await client.readContract({ address: plan, abi: FallbackPlanAbi, functionName: 'recipientAllocated' }), 750000n);
  const metricsText = await (await fetch(`http://127.0.0.1:${metrics}/metrics`)).text();
  const rollbacks = Number(metricsText.match(/^envio_rollback_total (\d+)$/m)?.[1]); assert.ok(rollbacks >= 1);
  await writeFile(join(root, 'docs/evidence/indexer-reorg.json'), JSON.stringify({ observedAt: new Date().toISOString(), runtime: 'Actual Envio 3.14.0 RPC indexer, isolated PostgreSQL and disposable Anvil snapshot/revert', chainId: 31337, rollbackCount: rollbacks, replacedBlockHash: true, orphanPaymentAndClosureRemoved: true, supporterAndInstallmentEntitiesRemoved: true, orphanTimelineRemoved: true, canonicalAllocation: '750000', canonicalEvents: after, duplicateCanonicalEvents: false, existingDatabasesModified: false, liveMonadReorgTested: false, externalNotificationRollbackTested: false }, null, 2) + '\n');
  console.log('Actual Envio reorg verified: orphan payment/closure/shares/history removed; canonical allocation reconciles without duplicates.');
} catch (error) {
  // Keep native output only in memory; emit fixed classifications, never its body.
  const code = typeof error === 'object' && error && 'code' in error && /^[A-Z0-9_]{5,30}$/.test(String(error.code)) ? String(error.code) : 'unclassified';
  console.error(JSON.stringify({ failure: 'INDEXER_REORG_VERIFICATION_FAILED', stage, code, exited: indexer?.exitCode, moduleResolution: /Cannot find module|Could not resolve|ERR_MODULE_NOT_FOUND/.test(diagnostic), missingTable: /does not exist/.test(diagnostic), handlerFailure: /handler|Handler/.test(diagnostic), schemaFailure: /schema|Schema/.test(diagnostic), configFailure: /config|Config/.test(diagnostic) }));
  process.exitCode = 1;
}
finally {
  if (indexer && indexer.exitCode === null) indexer.kill('SIGTERM');
  if (indexerExit) await indexerExit;
  node.kill('SIGTERM'); await nodeExit;
  await db.end(); await admin.unsafe(`DROP DATABASE "${name}"`); await admin.end();
  await rm(directory, { recursive: true, force: true });
}
