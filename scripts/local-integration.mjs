import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { readFile, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { createPublicClient, createWalletClient, defineChain, getAddress, http, parseEventLogs, zeroHash } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { foundryBinary } from './foundry-binary.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const build = spawnSync(foundryBinary('forge'), ['build', '--force'], { cwd: root + 'contracts', stdio: 'inherit' });
if (build.error) throw build.error;
if (build.status !== 0) throw new Error('Contract build failed');
const artifacts = {};
for (const name of ['FallbackTestToken', 'FallbackFactory', 'FallbackPlan']) artifacts[name] = JSON.parse(await readFile(`${root}contracts/out/${name}.sol/${name}.json`, 'utf8'));
const server = createServer();
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const port = server.address().port;
await new Promise(resolve => server.close(resolve));
const node = spawn(foundryBinary('anvil'), ['--silent', '--host', '127.0.0.1', '--port', String(port), '--chain-id', '31337'], { stdio: ['ignore', 'pipe', 'pipe'] });
const exited = once(node, 'exit');
let nodeError;
node.on('error', error => { nodeError = error; });
try {
  const chain = defineChain({ id: 31337, name: 'Fresh local Anvil', nativeCurrency: { name: 'Test ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [`http://127.0.0.1:${port}`] } } });
  const publicClient = createPublicClient({ chain, cacheTime: 0, pollingInterval: 50, transport: http(undefined, { retryCount: 0, timeout: 1000 }) });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (nodeError) throw nodeError;
    try { await publicClient.getChainId(); ready = true; break; } catch { await new Promise(resolve => setTimeout(resolve, 50)); }
  }
  if (!ready) throw new Error('Local node failed to start');
  // Anvil's public development mnemonic, never a real user wallet.
  const wallets = [0, 1, 2, 3, 4].map(addressIndex => createWalletClient({ chain, transport: http(), account: mnemonicToAccount('test test test test test test test test test test test junk', { addressIndex }) }));
  const [recipient, payee, a, b, worker] = wallets;
  const hashes = [];
  const events = [];
  const capture = async (r, hash) => {
    hashes.push(hash);
    const block = await publicClient.getBlock({ blockNumber: r.blockNumber });
    for (const e of parseEventLogs({ abi: [...artifacts.FallbackFactory.abi, ...artifacts.FallbackPlan.abi], logs: r.logs, strict: true })) {
      events.push({ contract: e.address.toLowerCase() === factory?.toLowerCase() ? 'FallbackFactory' : 'FallbackPlan', event: e.eventName, srcAddress: e.address, logIndex: e.logIndex, block: { number: Number(r.blockNumber), timestamp: Number(block.timestamp), hash: block.hash }, transaction: { hash }, params: e.args });
    }
  };
  const receipt = async hash => {
    const r = await publicClient.waitForTransactionReceipt({ hash });
    assert.equal(r.status, 'success');
    await capture(r, hash);
    return r;
  };
  const deploy = async name => {
    const artifact = artifacts[name];
    const r = await receipt(await recipient.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode.object, args: name === 'FallbackFactory' ? [token] : [] }));
    assert.ok(r.contractAddress);
    return getAddress(r.contractAddress);
  };
  let factory;
  const token = await deploy('FallbackTestToken');
  factory = await deploy('FallbackFactory');
  const call = async (wallet, name, address, functionName, args = []) => receipt(await wallet.writeContract({ address, abi: artifacts[name].abi, functionName, args }));
  const read = (name, address, functionName, args = []) => publicClient.readContract({ address, abi: artifacts[name].abi, functionName, args });
  assert.equal(await read('FallbackTestToken', token, 'decimals'), 6);
  assert.equal(await read('FallbackFactory', factory, 'token'), token);
  const networkCheck = spawnSync(process.execPath, [root + 'scripts/verify-network.mjs'], {
    encoding: 'utf8', env: { ...process.env, MONAD_RPC_URL: `http://127.0.0.1:${port}`, CHAIN_ID: '31337', TOKEN_ADDRESS: token, FACTORY_ADDRESS: factory },
  });
  assert.equal(networkCheck.status, 0, networkCheck.stderr);
  const verifiedDeployment = JSON.parse(networkCheck.stdout);
  assert.equal(verifiedDeployment.assetVerified, true);
  assert.equal(verifiedDeployment.deploymentVerified, true);
  for (const wallet of [recipient, a, b]) await call(recipient, 'FallbackTestToken', token, 'mint', [wallet.account.address, 1000_000_000n]);

  const createPlan = async (cap, count = 3) => {
    const now = (await publicClient.getBlock()).timestamp;
    const t = { amount: 150_000_000n, minimumReserve: 1_000_000n, maximumReserve: 300_000_000n, perPaymentCap: cap, firstDue: now + 1000n, interval: 1000n, grace: 100n, fundingDeadline: now + 800n, coverBps: 10_000, count, metadataCommitment: zeroHash };
    const nonce = await read('FallbackFactory', factory, 'nonces', [recipient.account.address]);
    const expires = now + 700n;
    const hash = await read('FallbackFactory', factory, 'proposalHash', [recipient.account.address, payee.account.address, t, nonce, expires]);
    await call(recipient, 'FallbackFactory', factory, 'propose', [payee.account.address, t, expires]);
    await call(payee, 'FallbackFactory', factory, 'accept', [hash]);
    const r = await call(recipient, 'FallbackFactory', factory, 'publish', [payee.account.address, t, nonce, expires]);
    const [created] = parseEventLogs({ abi: artifacts.FallbackFactory.abi, logs: r.logs, eventName: 'PlanCreated', strict: true });
    assert.ok(created);
    return { address: created.args.plan, terms: t };
  };
  const deposit = async (wallet, plan, amount, own = false) => {
    await call(wallet, 'FallbackTestToken', token, 'approve', [plan.address, amount]);
    await call(wallet, 'FallbackPlan', plan.address, own ? 'addOwn' : 'contribute', [amount]);
  };
  const at = async timestamp => publicClient.request({ method: 'evm_setNextBlockTimestamp', params: [Number(timestamp)] });
  const conserved = async plan => {
    const values = await Promise.all(['totalDeposited', 'totalPaid', 'totalWithdrawn', 'totalClaimed', 'liabilities'].map(name => read('FallbackPlan', plan.address, name)));
    assert.equal(values[0], values.slice(1).reduce((sum, v) => sum + v, 0n));
  };
  const first = await createPlan(150_000_000n);
  await deposit(recipient, first, 250_000_000n, true);
  await deposit(a, first, 200_000_000n);
  await deposit(b, first, 100_000_000n);
  await call(recipient, 'FallbackPlan', first.address, 'activate');
  const splits = [];
  for (let i = 0; i < 3; i++) {
    await at(first.terms.firstDue + BigInt(i) * first.terms.interval);
    const r = await call(worker, 'FallbackPlan', first.address, 'settleNext');
    const [payment] = parseEventLogs({ abi: artifacts.FallbackPlan.abi, logs: r.logs, eventName: 'PaymentSettled', strict: true });
    splits.push([payment.args.own.toString(), payment.args.support.toString()]);
    await conserved(first);
  }
  assert.deepEqual(splits, [['150000000', '0'], ['100000000', '50000000'], ['0', '150000000']]);
  assert.equal(await read('FallbackTestToken', token, 'balanceOf', [payee.account.address]), 450_000_000n);
  const refundA = await read('FallbackPlan', first.address, 'claimable', [a.account.address]);
  const refundB = await read('FallbackPlan', first.address, 'claimable', [b.account.address]);
  assert.equal(refundA, 66_666_666n);
  assert.equal(refundB, 33_333_334n);
  await call(worker, 'FallbackPlan', first.address, 'claimFor', [b.account.address]);
  await call(worker, 'FallbackPlan', first.address, 'claimFor', [a.account.address]);
  await conserved(first);
  assert.equal(await read('FallbackPlan', first.address, 'liabilities'), 0n);

  const recover = await createPlan(50_000_000n, 1);
  await deposit(a, recover, 300_000_000n);
  await call(recipient, 'FallbackPlan', recover.address, 'activate');
  await at(recover.terms.firstDue);
  await publicClient.request({ method: 'evm_mine' });
  await assert.rejects(publicClient.simulateContract({ address: recover.address, abi: artifacts.FallbackPlan.abi, functionName: 'settleNext', account: worker.account }));
  assert.equal(await read('FallbackPlan', recover.address, 'reserveRemaining'), 300_000_000n);
  await deposit(recipient, recover, 100_000_000n, true);
  // Two independently signing workers compete; only one transaction can pay.
  const races = await Promise.allSettled([worker, b].map(async wallet => {
    const hash = await wallet.writeContract({ address: recover.address, abi: artifacts.FallbackPlan.abi, functionName: 'settleNext', gas: 400_000n });
    const r = await publicClient.waitForTransactionReceipt({ hash });
    await capture(r, hash);
    return r.status;
  }));
  assert.equal(races.filter(r => r.status === 'fulfilled' && r.value === 'success').length, 1);
  assert.equal(await read('FallbackPlan', recover.address, 'totalPaid'), 150_000_000n);
  await conserved(recover);

  const late = await createPlan(50_000_000n, 1);
  await deposit(a, late, 300_000_000n);
  await call(recipient, 'FallbackPlan', late.address, 'activate');
  await at(late.terms.firstDue + late.terms.grace);
  await deposit(recipient, late, 100_000_000n, true);
  await assert.rejects(publicClient.simulateContract({ address: late.address, abi: artifacts.FallbackPlan.abi, functionName: 'settleNext', account: worker.account }));
  await call(worker, 'FallbackPlan', late.address, 'expireNext');
  assert.equal(await read('FallbackPlan', late.address, 'totalPaid'), 0n);
  assert.equal(await read('FallbackPlan', late.address, 'claimable', [recipient.account.address]), 100_000_000n);
  await conserved(late);
  const report = { network: 'fresh local Anvil, chain 31337; ephemeral and stopped after test', token, factory, verifiedDeployment, plans: [first.address, recover.address, late.address], decimals: 6, splits, refundA: refundA.toString(), refundB: refundB.toString(), race: 'one confirmed success', topUpRecovery: 'passed', lateTopUp: 'missed, never paid', observedAt: new Date().toISOString(), transactionHashes: hashes };
  await writeFile(`${root}docs/evidence/local-integration.json`, JSON.stringify(report, null, 2));
  await writeFile(`${root}docs/evidence/local-events.json`, JSON.stringify(events, (_, value) => typeof value === 'bigint' ? { bigint: value.toString() } : value, 2));
  console.log('Local deployed-contract integration passed: exact splits/refunds, cap recovery, late expiry, and worker race.');
} finally {
  node.kill('SIGTERM');
  await exited;
}
