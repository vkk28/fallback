import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ read: vi.fn(), multi: vi.fn(), chainId: vi.fn(), block: vi.fn() }));
vi.mock('viem', async load => ({ ...await load<typeof import('viem')>(), createPublicClient: () => ({ readContract: f.read, multicall: f.multi, getChainId: f.chainId, getBlock: f.block }) }));
import { planSnapshot, planSummarySnapshot } from './client.js';
const plan = `0x${'3'.repeat(40)}`, who = `0x${'4'.repeat(40)}`;
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('CHAIN_ID', '10143'); vi.stubEnv('FACTORY_ADDRESS', `0x${'1'.repeat(40)}`); vi.stubEnv('TOKEN_ADDRESS', `0x${'2'.repeat(40)}`);
  f.chainId.mockResolvedValue(10143); f.block.mockResolvedValue({ number: 20n, timestamp: 100n });
  f.read.mockImplementation(async ({ functionName }) => functionName === 'isPlan' ? true : { count: 3 });
});
afterEach(() => { vi.unstubAllEnvs(); });
it('pins the whole summary to one block and beneficiary in one all-or-nothing batch', async () => {
  f.multi.mockResolvedValue([1, 100n, 300n, 150n, { index: 1 }, 0n, [0n, 0n, 0n, 0n]]);
  expect(await planSummarySnapshot(plan, who)).toMatchObject({ lifecycle: 1, own: 100n, reserve: 300n, totalPaid: 150n, claimable: 0n });
  expect(f.multi).toHaveBeenCalledTimes(1);
  expect(f.multi.mock.calls[0]![0]).toMatchObject({ blockNumber: 20n, allowFailure: false });
  expect(f.multi.mock.calls[0]![0].contracts.every((c: {address: string}) => c.address.toLowerCase() === plan)).toBe(true);
  expect(f.multi.mock.calls[0]![0].contracts.find((c: {functionName: string}) => c.functionName === 'claimable').args).toEqual([who]);
});
it('uses the same snapshot block for terms, financial fields and every chronological outcome', async () => {
  f.multi.mockResolvedValueOnce([who, `0x${'5'.repeat(40)}`, 1, 100n, 300n, 0n, { index: 1 }, [], 300n, 0n, 150n, 0n, [0n, 0n, 0n, 0n]]).mockResolvedValueOnce([1, 0, 0]);
  expect(await planSnapshot(plan, who)).toMatchObject({ block: 20n, own: 100n, outcomes: [1, 0, 0] });
  expect(f.read).toHaveBeenCalledWith(expect.objectContaining({ functionName: 'terms', blockNumber: 20n }));
  expect(f.multi.mock.calls.every(([c]) => c.blockNumber === 20n && c.allowFailure === false)).toBe(true);
  expect(f.multi.mock.calls[1]![0].contracts.map((c: {args: number[]}) => c.args[0])).toEqual([0, 1, 2]);
});
it('fails the complete snapshot when any batch is unavailable; no substitute amounts', async () => {
  f.multi.mockRejectedValue(new Error('Controlled RPC subcall failure'));
  await expect(planSnapshot(plan, who)).rejects.toThrow('Controlled RPC subcall failure');
  await expect(planSummarySnapshot(plan, who)).rejects.toThrow('Controlled RPC subcall failure');
});
