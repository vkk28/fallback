import { createWalletClient, encodeFunctionData, getAddress, http, keccak256, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { chainClient, registeredPlan } from '../../../packages/chain/src/client.js';
import { FallbackPlanAbi } from '../../../packages/chain/src/FallbackPlan.js';
import { FallbackFactoryAbi } from '../../../packages/chain/src/FallbackFactory.js';
import { receiptNotifications } from '../../../packages/backend/src/receipts.js';
import { indexerQuery } from '../../../packages/backend/src/indexer.js';
import { z } from 'zod';
import type { Database } from '../../../packages/backend/src/database.js';
import type { Candidate, Gateway } from './jobs.js';
import { discoveryPageSize, type DiscoveryBatch } from '../../../packages/domain/src/scheduling.js';

export async function inspectCandidate(c: Candidate) {
  const config = await registeredPlan(c.plan);
  if (config.chain.id !== c.chainId) throw new Error('CHAIN_NOT_ALLOWLISTED');
  const lifecycle = await config.client.readContract({ address: config.plan, abi: FallbackPlanAbi, functionName: 'lifecycle' });
  const preview = await config.client.readContract({ address: config.plan, abi: FallbackPlanAbi, functionName: 'preview' });
  if (c.action === 'closeFunding') {
    const terms = await config.client.readContract({ address: config.plan, abi: FallbackPlanAbi, functionName: 'terms' });
    const block = await config.client.getBlock();
    return { allowed: lifecycle === 0 && block.timestamp >= terms.fundingDeadline, terminal: lifecycle !== 0 };
  }
  return { terminal: lifecycle === 2 || preview.index > c.installment, allowed: lifecycle === 1 && preview.index === c.installment && preview.reason === (c.action === 'settleNext' ? 0 : 4) };
}
export function workerGateway(db: Database): Gateway {
  const c = chainClient(), key = process.env.WORKER_PRIVATE_KEY;
  if (!key || !/^0x[0-9a-f]{64}$/i.test(key)) throw new Error('DEDICATED_WORKER_KEY_REQUIRED');
  const wallet = createWalletClient({ account: privateKeyToAccount(key as Hex), chain: c.chain, transport: http(c.rpc) });
  return {
    signer: wallet.account.address.toLowerCase(),
    inspect: inspectCandidate,
    prepare: async (job, nonceFloor) => {
      const state = await inspectCandidate(job);
      if (!state.allowed) throw new Error('STALE_JOB');
      await c.client.simulateContract({ account: wallet.account, address: getAddress(job.plan), abi: FallbackPlanAbi, functionName: job.action });
      const pendingNonce = await c.client.getTransactionCount({ address: wallet.account.address, blockTag: 'pending' });
      const nonce = Math.max(pendingNonce, nonceFloor);
      const request = await wallet.prepareTransactionRequest({ to: getAddress(job.plan), data: encodeFunctionData({ abi: FallbackPlanAbi, functionName: job.action }), value: 0n, nonce });
      const serialized = await wallet.signTransaction(request);
      return { serialized, hash: keccak256(serialized), nonce };
    },
    broadcast: serializedTransaction => c.client.sendRawTransaction({ serializedTransaction }),
    receipt: async hash => {
      try {
        const receipt = await c.client.getTransactionReceipt({ hash });
        const block = await c.client.getBlock({ blockNumber: receipt.blockNumber });
        if (receipt.transactionHash.toLowerCase() !== hash.toLowerCase() || receipt.blockHash !== block.hash) return 'pending';
        return receipt.status === 'success' ? 'success' : 'reverted';
      }
      catch { return 'pending'; }
    },
    notify: (plan, hash) => receiptNotifications(db, plan, hash),
  };
}
/** Bounded registry scan is an independent fallback if the indexer is unavailable. */
export async function discover(offset: number, limit = 50): Promise<Candidate[]> {
  const c = chainClient();
  const count = Number(await c.client.readContract({ address: c.factory, abi: FallbackFactoryAbi, functionName: 'planCount' }));
  const candidates: Candidate[] = [];
  for (let i = offset; i < Math.min(count, offset + Math.min(limit, 50)); i++) {
    const plan = await c.client.readContract({ address: c.factory, abi: FallbackFactoryAbi, functionName: 'planAt', args: [BigInt(i)] });
    const preview = await c.client.readContract({ address: plan, abi: FallbackPlanAbi, functionName: 'preview' });
    const lifecycle = await c.client.readContract({ address: plan, abi: FallbackPlanAbi, functionName: 'lifecycle' });
    const job: Candidate = { chainId: c.chain.id, plan, installment: preview.index, action: 'settleNext' };
    if (lifecycle === 0) {
      job.action = 'closeFunding';
      if ((await inspectCandidate(job)).allowed) candidates.push(job);
    } else if (lifecycle === 1 && [0, 4].includes(preview.reason)) {
      job.action = preview.reason === 0 ? 'settleNext' : 'expireNext'; candidates.push(job);
    }
  }
  return candidates;
}

/** Keyset pagination covers the full indexed registry, including closed rows for stable traversal. */
export async function discoverIndexed(cursor: string | null): Promise<Omit<DiscoveryBatch, 'batchId'>> {
  const c = chainClient();
  if (c.chain.id !== 10143 || (cursor !== null && !/^10143:0x[0-9a-f]{40}$/.test(cursor))) throw new Error('INVALID_DISCOVERY_CURSOR');
  const data = await indexerQuery(`query Candidates($chain: Int!, $cursor: String!, $limit: Int!) { Plan(where: {chainId: {_eq: $chain}, id: {_gt: $cursor}}, order_by: {id: asc}, limit: $limit) { id address } }`, { chain: c.chain.id, cursor: cursor || '', limit: discoveryPageSize + 1 });
  const rows = z.array(z.object({ id: z.string(), address: z.string().regex(/^0x[0-9a-f]{40}$/) }).refine(row => row.id === `${c.chain.id}:${row.address}`)).max(discoveryPageSize + 1).parse(data.Plan);
  if (rows.some((row, i) => row.id <= (i === 0 ? cursor || '' : rows[i - 1]!.id))) throw new Error('INVALID_DISCOVERY_ORDER');
  const result: DiscoveryBatch['candidates'] = [];
  const page = rows.slice(0, discoveryPageSize);
  for (const row of page) {
    const p = await registeredPlan(row.address);
    const lifecycle = await p.client.readContract({ address: p.plan, abi: FallbackPlanAbi, functionName: 'lifecycle' });
    if (lifecycle === 2) continue;
    const current = await p.client.readContract({ address: p.plan, abi: FallbackPlanAbi, functionName: 'preview' });
    const action = lifecycle === 0 ? 'closeFunding' : current.reason === 0 ? 'settleNext' : current.reason === 4 ? 'expireNext' : null;
    if (!action) continue;
    const candidate: DiscoveryBatch['candidates'][number] = { chainId: 10143, plan: p.plan.toLowerCase(), installment: lifecycle === 0 ? 0 : current.index, action };
    if ((await inspectCandidate(candidate)).allowed) result.push(candidate);
  }
  return { candidates: result, scanned: page.length, nextCursor: rows.length > discoveryPageSize ? page[page.length - 1]!.id : null };
}
