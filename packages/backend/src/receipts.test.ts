import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { encodeAbiParameters, encodeEventTopics, encodeFunctionData, erc20Abi } from 'viem';
import * as schema from './schema.js';
import type { Database } from './database.js';
import * as auth from './auth.js';
import * as chain from '../../chain/src/client.js';
import { FallbackPlanAbi } from '../../chain/src/FallbackPlan.js';
import { createDraft } from './plans.js';
import { reconcileRequest, receiptNotifications } from './receipts.js';
import { confirmedFundingApproval, outstandingRequest } from './transactions.js';
import { workerGateway } from '../../../apps/worker/src/gateway.js';
import { entryPoint07Address } from 'viem/account-abstraction';
import { operationEvent, beforeExecutionEvent } from './user-operation.js';

const actor = { id: 'fixture-recipient', address: '0x0000000000000000000000000000000000000100' as const, walletId: 'fixture-wallet', sessionId: 'fixture-session' };
const payee = '0x0000000000000000000000000000000000000200';
const planAddress = '0x0000000000000000000000000000000000000300';
const token = '0x0000000000000000000000000000000000000400';
const hash = `0x${'11'.repeat(32)}` as const, blockHash = `0x${'22'.repeat(32)}` as const;
const id = 'a'.repeat(64);
const input = { label: 'Fixture', payee, terms: { amount: '1000000', minimumReserve: '1000000', maximumReserve: '2000000', perPaymentCap: '1000000', firstDue: '1800000000', interval: '86400', grace: '3600', fundingDeadline: '1799000000', coverBps: 10000, count: 1 } };

describe('durable request receipt and approval recovery (local SQL/provider fixtures)', () => {
  let pg: PGlite, db: Database, planId: string;
  const provider = vi.fn(), receipt = vi.fn(), read = vi.fn(), block = vi.fn(), logs = vi.fn();
  const operationHash = `0x${'44'.repeat(32)}` as const;
  const executionLog = () => ({ address: entryPoint07Address, topics: encodeEventTopics({ abi: [beforeExecutionEvent], eventName: 'BeforeExecution' }), data: '0x', logIndex: 0 });
  const operationLog = (fields: { sender?: typeof actor.address | typeof payee; success?: boolean; operationHash?: `0x${string}`; logIndex?: number } = {}) => ({
    address: entryPoint07Address as `0x${string}`,
    topics: encodeEventTopics({ abi: [operationEvent], eventName: 'UserOperationEvent', args: { userOpHash: fields.operationHash ?? operationHash, sender: fields.sender ?? actor.address, paymaster: payee } }),
    data: encodeAbiParameters([{ type: 'uint256' }, { type: 'bool' }, { type: 'uint256' }, { type: 'uint256' }], [1n, fields.success ?? true, 2n, 3n]),
    logIndex: fields.logIndex ?? 2, transactionHash: hash, blockHash, blockNumber: 20n,
  });
  const operationProvider = () => providerResult({ transaction_hash: null, user_operation_hash: operationHash, status: 'broadcasted' });
  const approvalCall = () => encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [planAddress, 250000n] });
  const providerResult = (fields = {}) => ({ id: 'fixture-provider', wallet_id: actor.walletId, reference_id: id, caip2: 'eip155:10143', transaction_hash: hash, status: 'confirmed', sponsored: true, ...fields });
  const successReceipt = (logs: unknown[] = []) => ({ transactionHash: hash, blockNumber: 20n, blockHash, status: 'success', logs });
  const approvalLog = (value = 250000n) => ({ address: token, topics: encodeEventTopics({ abi: erc20Abi, eventName: 'Approval', args: { owner: actor.address, spender: planAddress } }), data: encodeAbiParameters([{ type: 'uint256' }], [value]), logIndex: 0 });
  async function request(fields = {}) {
    await db.insert(schema.transactionRequests).values({ id, userId: actor.id, planId, action: 'approveOwn', fingerprint: 'fixture', walletId: actor.walletId, destination: token, calldata: approvalCall(), providerId: 'fixture-provider', status: 'submitted', ...fields });
  }
  beforeEach(async () => {
    pg = new PGlite(); db = drizzle(pg, { schema });
    await migrate(drizzle(pg, { schema }), { migrationsFolder: 'infra/migrations' });
    const p = await db.transaction(tx => createDraft(tx, actor, input, new Date('2026-10-07T12:00:00Z')));
    planId = p.id;
    await db.update(schema.plans).set({ address: planAddress }).where(eq(schema.plans.id, planId));
    provider.mockReset().mockResolvedValue(providerResult());
    receipt.mockReset().mockResolvedValue(successReceipt([approvalLog()]));
    read.mockReset().mockResolvedValue(250000n);
    block.mockReset().mockResolvedValue({ hash: blockHash, number: 50n });
    logs.mockReset().mockResolvedValue([operationLog()]);
    vi.spyOn(auth, 'privyClient').mockReturnValue({ transactions: () => ({ get: provider }) } as unknown as ReturnType<typeof auth.privyClient>);
    vi.spyOn(chain, 'chainClient').mockReturnValue({ chain: { id: 10143 }, rpc: 'http://127.0.0.1:1', token, factory: payee, client: { getChainId: async () => 10143, getTransactionReceipt: receipt, getBlock: block, readContract: read, getLogs: logs } } as unknown as ReturnType<typeof chain.chainClient>);
  });
  afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllEnvs(); await pg.close(); });

  it.each(['pending', 'broadcasted', 'confirmed', 'replaced', 'provider_error', 'execution_reverted'])('preserves a hashless %s request and blocks a fresh action', async status => {
    await request(); provider.mockResolvedValue(providerResult({ status, transaction_hash: null }));
    expect(await reconcileRequest(db, actor, id)).toMatchObject({ status: 'submitted', hash: null });
    expect((await outstandingRequest(db, actor.id, planId))?.id).toBe(id);
    expect(receipt).not.toHaveBeenCalled();
    expect(await confirmedFundingApproval(db, actor, planId, 20n)).toBeNull();
  });
  it('recovers a stored hash during provider outage, then restores only the matching exact allowance', async () => {
    await request({ hash }); provider.mockRejectedValue(new Error('deliberate provider outage'));
    expect(await reconcileRequest(db, actor, id)).toMatchObject({ status: 'confirmed', hash, sponsored: null });
    expect(await outstandingRequest(db, actor.id, planId)).toBeUndefined();
    expect(await confirmedFundingApproval(db, actor, planId, 20n)).toEqual({ amount: '250000' });
    expect(read).toHaveBeenLastCalledWith(expect.objectContaining({ functionName: 'allowance', blockNumber: 20n, args: [actor.address, planAddress] }));
    read.mockResolvedValue(0n); // Approval consumed by a deposit.
    expect(await confirmedFundingApproval(db, actor, planId, 21n)).toBeNull();
    read.mockResolvedValue(500000n); // An unrelated/larger allowance is not this exact approval.
    expect(await confirmedFundingApproval(db, actor, planId, 21n)).toBeNull();
    expect(await confirmedFundingApproval(db, { ...actor, walletId: 'replacement-wallet' }, planId, 21n)).toBeNull();
  });
  it('retains the recovered hash when RPC is unavailable and later proves the same receipt', async () => {
    await request(); receipt.mockRejectedValueOnce(new Error('deliberate RPC outage'));
    expect(await reconcileRequest(db, actor, id)).toMatchObject({ status: 'pending-confirmation', hash });
    expect((await outstandingRequest(db, actor.id, planId))?.hash).toBe(hash);
    expect(await reconcileRequest(db, actor, id)).toMatchObject({ status: 'confirmed', hash });
    expect(await db.select().from(schema.transactionRequests)).toHaveLength(1);
  });
  it.each([
    { wallet_id: 'unrelated-wallet' }, { id: 'unrelated-provider' },
    { caip2: 'eip155:1' }, { reference_id: 'unrelated-request' },
  ])('rejects mismatched provider identity before persisting a hash or failure: %j', async fields => {
    await request(); provider.mockResolvedValue(providerResult({ status: 'failed', transaction_hash: null, ...fields }));
    await expect(reconcileRequest(db, actor, id)).rejects.toMatchObject({ status: 409 });
    expect((await outstandingRequest(db, actor.id, planId))?.status).toBe('submitted');
    expect(receipt).not.toHaveBeenCalled();
  });
  it('keeps a changed provider hash unresolved instead of silently following a replacement', async () => {
    await request({ hash }); provider.mockResolvedValue(providerResult({ transaction_hash: `0x${'33'.repeat(32)}` }));
    await expect(reconcileRequest(db, actor, id)).rejects.toMatchObject({ code: 'PROVIDER_HASH_CHANGED_RECONCILE' });
    expect((await outstandingRequest(db, actor.id, planId))?.hash).toBe(hash);
  });
  it('accepts explicit provider failure without a hash but never invents a receipt', async () => {
    await request(); provider.mockResolvedValue(providerResult({ status: 'failed', transaction_hash: null }));
    expect(await reconcileRequest(db, actor, id)).toEqual({ status: 'failed', hash: null });
    expect(await outstandingRequest(db, actor.id, planId)).toBeUndefined();
    expect(receipt).not.toHaveBeenCalled();
  });
  it('records a canonical reverted publication without querying proposal state or sending notifications', async () => {
    await request({ action: 'publish', destination: payee, calldata: '0x' });
    receipt.mockResolvedValue({ ...successReceipt(), status: 'reverted' });
    expect(await reconcileRequest(db, actor, id)).toMatchObject({ status: 'failed', hash });
    expect(read).not.toHaveBeenCalled();
    expect(await db.select().from(schema.notifications)).toHaveLength(0);
  });
  it('rejects an orphaned receipt before marking an approval confirmed', async () => {
    await request(); block.mockResolvedValue({ hash: `0x${'33'.repeat(32)}` });
    await expect(reconcileRequest(db, actor, id)).rejects.toMatchObject({ code: 'NONCANONICAL_RECEIPT_RECONCILE' });
    expect((await outstandingRequest(db, actor.id, planId))?.status).toBe('submitted');
    expect(await db.select().from(schema.notifications)).toHaveLength(0);
  });
  it('does not treat a successful receipt for another amount as the expected approval', async () => {
    await request(); receipt.mockResolvedValue(successReceipt([approvalLog(500000n)]));
    await expect(reconcileRequest(db, actor, id)).rejects.toMatchObject({ code: 'EXPECTED_EVENT_NOT_CONFIRMED' });
    expect((await outstandingRequest(db, actor.id, planId))?.status).toBe('submitted');
  });
  it('recovers receipt notifications idempotently across repeated reconciliation', async () => {
    await request({ action: 'cancel', destination: planAddress, calldata: encodeFunctionData({ abi: FallbackPlanAbi, functionName: 'cancel' }) });
    const log = { address: planAddress, topics: encodeEventTopics({ abi: FallbackPlanAbi, eventName: 'Closed' }), data: encodeAbiParameters([{ type: 'uint8' }, { type: 'uint256' }, { type: 'uint256' }], [2, 500000n, 1000000n]), logIndex: 0 };
    receipt.mockResolvedValue(successReceipt([log]));
    expect(await reconcileRequest(db, actor, id)).toMatchObject({ status: 'confirmed' });
    expect(await reconcileRequest(db, actor, id)).toMatchObject({ status: 'confirmed' });
    expect(await db.select().from(schema.notifications)).toHaveLength(1);
  });
  it('does not expose another account request to provider or chain', async () => {
    await request();
    await expect(reconcileRequest(db, { ...actor, id: 'unrelated-account' }, id)).rejects.toMatchObject({ status: 404 });
    expect(provider).not.toHaveBeenCalled(); expect(receipt).not.toHaveBeenCalled();
  });
  it('refuses orphaned receipt notifications even through the worker entry point', async () => {
    block.mockResolvedValue({ hash: `0x${'33'.repeat(32)}` });
    await expect(receiptNotifications(db, planAddress, hash)).rejects.toMatchObject({ code: 'NONCANONICAL_RECEIPT_RECONCILE' });
    expect(await db.select().from(schema.notifications)).toHaveLength(0);
  });
  it('keeps orphaned worker receipts pending, including reverted receipts', async () => {
    vi.stubEnv('WORKER_PRIVATE_KEY', `0x${'01'.repeat(32)}`); // Isolated fixture key; no send is invoked.
    const gateway = workerGateway(db);
    block.mockResolvedValue({ hash: `0x${'33'.repeat(32)}` });
    expect(await gateway.receipt(hash)).toBe('pending');
    receipt.mockResolvedValue({ ...successReceipt(), status: 'reverted' });
    expect(await gateway.receipt(hash)).toBe('pending');
    block.mockResolvedValue({ hash: blockHash });
    expect(await gateway.receipt(hash)).toBe('reverted');
  });
  it('never restores approval from an unconfirmed or another-plan request', async () => {
    await request();
    expect(await confirmedFundingApproval(db, actor, planId, 20n)).toBeNull();
    await db.update(schema.transactionRequests).set({ status: 'confirmed', hash, calldata: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [payee, 250000n] }) }).where(eq(schema.transactionRequests.id, id));
    expect(await confirmedFundingApproval(db, actor, planId, 20n)).toBeNull();
    expect(read).not.toHaveBeenCalled();
  });
  it('recovers a hashless operation only with its canonical exact approval, without adding a request', async () => {
    await request(); provider.mockResolvedValue(operationProvider());
    receipt.mockResolvedValue(successReceipt([executionLog(), { ...approvalLog(), logIndex: 1 }, operationLog()]));
    expect(await reconcileRequest(db, actor, id)).toMatchObject({ status: 'confirmed', hash, sponsored: true });
    expect(await reconcileRequest(db, actor, id)).toMatchObject({ status: 'confirmed', hash });
    expect(await db.select().from(schema.transactionRequests)).toHaveLength(1);
    expect(await confirmedFundingApproval(db, actor, planId, 20n)).toEqual({ amount: '250000' });
    expect(logs).toHaveBeenCalledTimes(1); // Reconnect uses the already recovered hash.
  });
  it.each(['unknown-operation', 'wrong-sender', 'unknown-entrypoint', 'missing-boundary', 'wrong-amount', 'orphaned-block', 'wrong-log-block'])('preserves the hashless request when operation proof is %s', async problem => {
    await request(); provider.mockResolvedValue(operationProvider());
    const op = operationLog(problem === 'wrong-sender' ? { sender: payee } : problem === 'unknown-operation' ? { operationHash: `0x${'55'.repeat(32)}` } : {});
    if (problem === 'unknown-entrypoint') op.address = token;
    if (problem === 'wrong-log-block') logs.mockResolvedValue([{ ...operationLog(), blockHash: `0x${'55'.repeat(32)}` }]);
    if (problem === 'orphaned-block') block.mockResolvedValue({ hash: `0x${'55'.repeat(32)}`, number: 50n });
    receipt.mockResolvedValue(successReceipt([...(problem === 'missing-boundary' ? [] : [executionLog()]), { ...approvalLog(problem === 'wrong-amount' ? 500000n : 250000n), logIndex: 1 }, op]));
    await expect(reconcileRequest(db, actor, id)).rejects.toMatchObject({ status: 409 });
    expect((await outstandingRequest(db, actor.id, planId))?.hash).toBeNull();
    expect(await confirmedFundingApproval(db, actor, planId, 20n)).toBeNull();
  });
  it('rejects an approval from another operation in the same successful bundle', async () => {
    await request(); provider.mockResolvedValue(operationProvider());
    receipt.mockResolvedValue(successReceipt([executionLog(), { ...approvalLog(), logIndex: 1 }, operationLog({ operationHash: `0x${'55'.repeat(32)}`, logIndex: 2 }), operationLog({ logIndex: 3 })]));
    logs.mockResolvedValue([operationLog({ logIndex: 3 })]);
    await expect(reconcileRequest(db, actor, id)).rejects.toMatchObject({ code: 'EXPECTED_EVENT_NOT_CONFIRMED' });
    expect((await outstandingRequest(db, actor.id, planId))?.hash).toBeNull();
  });
  it('excludes account-validation events before BeforeExecution', async () => {
    await request(); provider.mockResolvedValue(operationProvider());
    receipt.mockResolvedValue(successReceipt([approvalLog(), { ...executionLog(), logIndex: 1 }, operationLog()]));
    await expect(reconcileRequest(db, actor, id)).rejects.toMatchObject({ code: 'EXPECTED_EVENT_NOT_CONFIRMED' });
    expect((await outstandingRequest(db, actor.id, planId))?.hash).toBeNull();
  });
  it('recognizes a failed operation inside a successful outer transaction', async () => {
    await request(); provider.mockResolvedValue(operationProvider());
    const op = operationLog({ success: false }); logs.mockResolvedValue([op]);
    receipt.mockResolvedValue(successReceipt([executionLog(), op]));
    expect(await reconcileRequest(db, actor, id)).toMatchObject({ status: 'failed', hash });
    expect(await confirmedFundingApproval(db, actor, planId, 20n)).toBeNull();
    expect(await db.select().from(schema.notifications)).toHaveLength(0);
  });
  it('keeps a hashless operation pending during a log RPC outage', async () => {
    await request(); provider.mockResolvedValue(operationProvider()); logs.mockRejectedValue(new Error('fixture RPC outage'));
    expect(await reconcileRequest(db, actor, id)).toMatchObject({ status: 'pending-confirmation', hash: null });
    expect((await outstandingRequest(db, actor.id, planId))?.status).toBe('submitted');
  });
  it('rejects a contradictory operation log position before recovering the hash', async () => {
    await request(); provider.mockResolvedValue(operationProvider());
    logs.mockResolvedValue([operationLog({ logIndex: 3 })]);
    receipt.mockResolvedValue(successReceipt([executionLog(), { ...approvalLog(), logIndex: 1 }, operationLog()]));
    await expect(reconcileRequest(db, actor, id)).rejects.toMatchObject({ code: 'USER_OPERATION_MISMATCH_RECONCILE' });
    expect((await outstandingRequest(db, actor.id, planId))?.hash).toBeNull();
  });
  it('recognizes a canonical outer revert even when the provider supplies an operation hash', async () => {
    await request(); provider.mockResolvedValue(providerResult({ user_operation_hash: operationHash }));
    receipt.mockResolvedValue({ ...successReceipt(), status: 'reverted' });
    expect(await reconcileRequest(db, actor, id)).toMatchObject({ status: 'failed', hash });
    expect(logs).not.toHaveBeenCalled();
    expect(await db.select().from(schema.notifications)).toHaveLength(0);
  });
  it('rejects a malformed provider operation identifier without releasing the request', async () => {
    await request(); provider.mockResolvedValue({ ...operationProvider(), user_operation_hash: 'malformed', status: 'failed' });
    await expect(reconcileRequest(db, actor, id)).rejects.toMatchObject({ code: 'USER_OPERATION_MISMATCH_RECONCILE' });
    expect((await outstandingRequest(db, actor.id, planId))?.hash).toBeNull();
    expect(logs).not.toHaveBeenCalled();
  });
  it('bounds a missing-operation scan and does not infer failure from provider status or elapsed time', async () => {
    await request(); provider.mockResolvedValue({ ...operationProvider(), status: 'failed' });
    block.mockResolvedValue({ hash: blockHash, number: 3000n }); logs.mockResolvedValue([]);
    expect(await reconcileRequest(db, actor, id)).toMatchObject({ status: 'submitted', hash: null });
    expect(logs).toHaveBeenCalledTimes(20);
    expect(logs).toHaveBeenNthCalledWith(1, expect.objectContaining({ fromBlock: 2901n, toBlock: 3000n }));
    expect(logs).toHaveBeenNthCalledWith(20, expect.objectContaining({ fromBlock: 1001n, toBlock: 1100n }));
    expect(receipt).not.toHaveBeenCalled();
    expect((await outstandingRequest(db, actor.id, planId))?.status).toBe('submitted');
  });
});
