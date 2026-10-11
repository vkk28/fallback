import { it, expect, vi, beforeEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as schema from '../../../packages/backend/src/schema.js';
import { discoveryBatch, enqueueDiscoveryBatch } from './discovery.js';
import { discoverIndexed, inspectCandidate } from './gateway.js';

const mocks = vi.hoisted(() => ({ query: vi.fn(), read: vi.fn(), registered: vi.fn() }));
vi.mock('../../../packages/backend/src/indexer.js', () => ({ indexerQuery: mocks.query }));
vi.mock('../../../packages/chain/src/client.js', () => ({
  chainClient: () => ({ chain: { id: 10143 } }), registeredPlan: mocks.registered,
}));
const address = (n: number) => `0x${n.toString(16).padStart(40, '0')}`;
const rows = Array.from({ length: 63 }, (_, i) => ({ id: `10143:${address(i + 1)}`, address: address(i + 1) }));
const id = `10143:${address(1000)}`;
let closed: Set<string>;
beforeEach(() => {
  vi.clearAllMocks(); closed = new Set();
  mocks.query.mockImplementation(async (_query: string, variables: { cursor: string; limit: number }) => ({ Plan: rows.filter(row => row.id > variables.cursor).slice(0, variables.limit) }));
  mocks.read.mockImplementation(async (request: { address: string; functionName: string }) => {
    if (request.functionName === 'lifecycle') return closed.has(request.address) ? 2 : 1;
    if (request.functionName === 'preview') return { index: 0, reason: 0 };
    throw new Error('Unexpected fixture read');
  });
  mocks.registered.mockImplementation(async (plan: string) => ({ chain: { id: 10143 }, plan, client: { readContract: mocks.read } }));
});

it('covers 63 indexed plans without candidate truncation and preserves a frozen page across restart', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fallback-discovery-'));
  let pg = new PGlite(directory), db = drizzle(pg, { schema });
  try {
    await migrate(db, { migrationsFolder: 'infra/migrations' });
    const first = await discoveryBatch(db, id, discoverIndexed);
    expect(first.candidates).toHaveLength(20);
    expect(await discoveryBatch(db, id, discoverIndexed)).toEqual(first);
    expect(mocks.query).toHaveBeenCalledTimes(1);
    await pg.close(); pg = new PGlite(directory); db = drizzle(pg, { schema });
    expect(await discoveryBatch(db, id, discoverIndexed)).toEqual(first);
    // The enqueue API is strict: only batchId and the agreed candidates are accepted.
    await expect(enqueueDiscoveryBatch(db, id, first, inspectCandidate)).rejects.toThrow();
    const input = { batchId: first.batchId, candidates: first.candidates };
    const result = await enqueueDiscoveryBatch(db, id, input, inspectCandidate);
    expect(result.accepted).toBe(20); expect(result.paid).toBe(false);
    expect(await enqueueDiscoveryBatch(db, id, input, inspectCandidate)).toEqual(result);
    const sizes = [20];
    for (let i = 0; i < 3; i++) {
      const batch = await discoveryBatch(db, id, discoverIndexed);
      sizes.push(batch.candidates.length);
      const ack = await enqueueDiscoveryBatch(db, id, { batchId: batch.batchId, candidates: batch.candidates }, inspectCandidate);
      expect(ack.wrapped).toBe(i === 2);
    }
    expect(sizes).toEqual([20, 20, 20, 3]);
    expect(await db.select().from(schema.jobs)).toHaveLength(63);
    const next = await discoveryBatch(db, id, discoverIndexed);
    expect(next.candidates).toEqual(first.candidates);
    await enqueueDiscoveryBatch(db, id, { batchId: next.batchId, candidates: next.candidates }, inspectCandidate);
    expect(await db.select().from(schema.jobs)).toHaveLength(63);
  } finally { await pg.close(); await rm(directory, { recursive: true, force: true }); }
});

it('rolls back jobs and cursor on RPC failure, rejects tampering, and advances past stale candidates', async () => {
  const pg = new PGlite(), db = drizzle(pg, { schema });
  try {
    await migrate(db, { migrationsFolder: 'infra/migrations' });
    mocks.query.mockRejectedValueOnce(new Error('INDEXER_UNAVAILABLE'));
    await expect(discoveryBatch(db, id, discoverIndexed)).rejects.toThrow('INDEXER_UNAVAILABLE');
    const batch = await discoveryBatch(db, id, discoverIndexed), input = { batchId: batch.batchId, candidates: batch.candidates };
    await expect(enqueueDiscoveryBatch(db, id, { ...input, candidates: input.candidates.slice(1) }, inspectCandidate)).rejects.toMatchObject({ code: 'STALE_DISCOVERY_BATCH' });
    let calls = 0;
    await expect(enqueueDiscoveryBatch(db, id, input, async () => {
      if (++calls === 10) throw new Error('RPC_UNAVAILABLE');
      return { allowed: true };
    })).rejects.toThrow('RPC_UNAVAILABLE');
    expect(await db.select().from(schema.jobs)).toHaveLength(0);
    expect(await discoveryBatch(db, id, discoverIndexed)).toEqual(batch);
    closed.add(batch.candidates[0]!.plan);
    const ack = await enqueueDiscoveryBatch(db, id, input, inspectCandidate);
    expect(ack).toMatchObject({ accepted: 19, stale: 1, paid: false });
    await expect(enqueueDiscoveryBatch(db, id, { ...input, candidates: input.candidates.slice(1) }, inspectCandidate)).rejects.toMatchObject({ code: 'STALE_DISCOVERY_BATCH' });
    const next = await discoveryBatch(db, id, discoverIndexed);
    expect(next.candidates[0]?.plan).toBe(address(21));
    expect(await enqueueDiscoveryBatch(db, id, input, inspectCandidate)).toEqual(ack);
    expect(await discoveryBatch(db, id, discoverIndexed)).toEqual(next);
  } finally { await pg.close(); }
});

it('advances an empty candidate page and uses chain lifecycle when the indexer is stale', async () => {
  const pg = new PGlite(), db = drizzle(pg, { schema });
  try {
    await migrate(db, { migrationsFolder: 'infra/migrations' });
    rows.slice(0, 20).forEach(row => closed.add(row.address));
    const batch = await discoveryBatch(db, id, discoverIndexed);
    expect(batch).toMatchObject({ candidates: [], scanned: 20, nextCursor: rows[19]!.id });
    const ack = await enqueueDiscoveryBatch(db, id, { batchId: batch.batchId, candidates: [] }, inspectCandidate);
    expect(ack).toMatchObject({ accepted: 0, stale: 0, wrapped: false });
    expect((await discoveryBatch(db, id, discoverIndexed)).candidates[0]?.plan).toBe(address(21));
    expect(mocks.query.mock.calls[0]?.[0]).not.toContain('lifecycle:');
    await expect(discoverIndexed('10143:not-a-plan')).rejects.toThrow('INVALID_DISCOVERY_CURSOR');
    mocks.query.mockResolvedValueOnce({ Plan: [...rows.slice(0, 2)].reverse() });
    await expect(discoverIndexed(null)).rejects.toThrow('INVALID_DISCOVERY_ORDER');
  } finally { await pg.close(); }
});
