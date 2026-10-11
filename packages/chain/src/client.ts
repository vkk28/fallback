import { createPublicClient, defineChain, getAddress, http } from 'viem';
import { FallbackFactoryAbi } from './FallbackFactory.js';
import { FallbackPlanAbi } from './FallbackPlan.js';

export function chainConfiguration() {
  const id = Number(process.env.CHAIN_ID || 10143);
  if (![10143, 31337].includes(id)) throw new Error('TEST_NETWORK_REQUIRED');
  const rpc = process.env.MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz';
  const factory = process.env.FACTORY_ADDRESS, token = process.env.TOKEN_ADDRESS;
  if (!factory || !token) throw new Error('DEPLOYMENT_NOT_CONFIGURED');
  return { chain: defineChain({ id, name: id === 10143 ? 'Monad Testnet' : 'Local Anvil', nativeCurrency: { name: 'Test MON', symbol: 'MON', decimals: 18 }, rpcUrls: { default: { http: [rpc] } } }), factory: getAddress(factory), token: getAddress(token), rpc };
}
export function chainClient() {
  const config = chainConfiguration();
  return { ...config, client: createPublicClient({ chain: config.chain, cacheTime: 0, transport: http(config.rpc, { timeout: 15_000, retryCount: 1 }) }) };
}
export async function registeredPlan(address: string) {
  const c = chainClient(), plan = getAddress(address);
  if (await c.client.getChainId() !== c.chain.id) throw new Error('NETWORK_MISMATCH');
  if (!await c.client.readContract({ address: c.factory, abi: FallbackFactoryAbi, functionName: 'isPlan', args: [plan] })) throw new Error('UNREGISTERED_PLAN');
  return { ...c, plan };
}
export async function planSnapshot(address: string, beneficiary?: string) {
  const c = await registeredPlan(address);
  const block = await c.client.getBlock();
  const read = <N extends 'terms' | 'recipient' | 'payee' | 'lifecycle' | 'recipientAllocated' | 'reserveRemaining' | 'supportUsed' | 'preview' | 'supporters'>(functionName: N) => c.client.readContract({ address: c.plan, abi: FallbackPlanAbi, functionName, blockNumber: block.number });
  const [terms, recipient, payee, lifecycle, own, reserve, used, preview, supporters] = await Promise.all([read('terms'), read('recipient'), read('payee'), read('lifecycle'), read('recipientAllocated'), read('reserveRemaining'), read('supportUsed'), read('preview'), read('supporters')]);
  const frozenFunding = await c.client.readContract({ address: c.plan, abi: FallbackPlanAbi, functionName: 'frozenFunding', blockNumber: block.number });
  const frozenReserve = await c.client.readContract({ address: c.plan, abi: FallbackPlanAbi, functionName: 'frozenReserve', blockNumber: block.number });
  const totalPaid = await c.client.readContract({ address: c.plan, abi: FallbackPlanAbi, functionName: 'totalPaid', blockNumber: block.number });
  const claimable = beneficiary ? await c.client.readContract({ address: c.plan, abi: FallbackPlanAbi, functionName: 'claimable', args: [getAddress(beneficiary)], blockNumber: block.number }) : 0n;
  const share = beneficiary ? await c.client.readContract({ address: c.plan, abi: FallbackPlanAbi, functionName: 'shares', args: [getAddress(beneficiary)], blockNumber: block.number }) : null;
  const outcomes = await Promise.all(Array.from({ length: terms.count }, (_, i) => c.client.readContract({ address: c.plan, abi: FallbackPlanAbi, functionName: 'outcomes', args: [i], blockNumber: block.number })));
  return { terms, recipient, payee, lifecycle, own, reserve, used, preview, supporters, frozenFunding, frozenReserve, totalPaid, claimable, share, outcomes, block: block.number, timestamp: block.timestamp, observedAt: new Date().toISOString(), chainId: c.chain.id };
}

/** Bounded Home reads; no history, schedule arrays or refund arithmetic. */
export async function planSummarySnapshot(address: string, beneficiary: string) {
  const c = await registeredPlan(address), block = await c.client.getBlock();
  const read = <N extends 'lifecycle' | 'recipientAllocated' | 'reserveRemaining' | 'totalPaid' | 'preview'>(functionName: N) => c.client.readContract({ address: c.plan, abi: FallbackPlanAbi, functionName, blockNumber: block.number });
  // Keep public-RPC bursts small while the indexer catches up. All summary
  // fields remain pinned to the same block.
  const lifecycle = await read('lifecycle'), own = await read('recipientAllocated');
  const reserve = await read('reserveRemaining'), totalPaid = await read('totalPaid');
  const preview = await read('preview');
  const claimable = await c.client.readContract({ address: c.plan, abi: FallbackPlanAbi, functionName: 'claimable', args: [getAddress(beneficiary)], blockNumber: block.number });
  const share = await c.client.readContract({ address: c.plan, abi: FallbackPlanAbi, functionName: 'shares', args: [getAddress(beneficiary)], blockNumber: block.number });
  return { lifecycle, own, reserve, totalPaid, preview, claimable, share, observedAt: new Date().toISOString() };
}
