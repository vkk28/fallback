import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from './schema.js';
import type { Database } from './database.js';
import * as chain from '../../chain/src/client.js';
import * as indexer from './indexer.js';
import { operationalHealth } from './operations.js';
import { beginWorkerCycle, finishWorkerCycle } from '../../../apps/worker/src/heartbeat.js';
let pg: PGlite, db: Database;
const now = new Date('2026-10-12T10:00:00Z');
beforeEach(async () => {
  pg = new PGlite(); db = drizzle(pg, { schema }); await migrate(drizzle(pg, { schema }), { migrationsFolder: 'infra/migrations' });
  vi.spyOn(chain, 'chainClient').mockReturnValue({ chain: { id: 10143 }, client: { getChainId: async () => 10143, getBlockNumber: async () => 1000n } } as unknown as ReturnType<typeof chain.chainClient>);
  vi.spyOn(indexer, 'processingWatermark').mockResolvedValue({ chainId: 10143, processedBlock: '998', sourceBlock: '1000', observedAt: now.toISOString() });
});
afterEach(async () => { vi.restoreAllMocks(); await pg.close(); });
it('preserves a newer worker heartbeat against a stale completion and distinguishes failed cycles', async () => {
  const old = await beginWorkerCycle(db, 'hosted', now), latest = await beginWorkerCycle(db, 'hosted', now);
  await finishWorkerCycle(db, 'hosted', old, true, now);
  expect((await operationalHealth(db, 'hosted', now)).diagnostics).toContain('WORKER_HEARTBEAT_STALE_OR_UNKNOWN');
  await finishWorkerCycle(db, 'hosted', latest, true, now);
  expect(await operationalHealth(db, 'hosted', now)).toMatchObject({ healthy: true, indexerLagBlocks: '2', unresolvedBroadcasts: 0 });
  const failed = await beginWorkerCycle(db, 'hosted', now); await finishWorkerCycle(db, 'hosted', failed, false, now);
  expect((await operationalHealth(db, 'hosted', now)).diagnostics).toContain('WORKER_LAST_CYCLE_FAILED');
});
it('reports stale workers, failed jobs and unresolved broadcasts without exposing identities', async () => {
  const run = await beginWorkerCycle(db, 'hosted', now); await finishWorkerCycle(db, 'hosted', run, true, now);
  for (const [i, status] of ['failed', 'submitted'].entries()) await db.insert(schema.jobs).values({ id: `private-job-${i}`, chainId: 10143, plan: `0x${'a'.repeat(40)}`, installment: i, action: 'settleNext', status: status as 'failed' | 'submitted', transactionHash: `0x${'b'.repeat(64)}` });
  const report = await operationalHealth(db, 'hosted', new Date(now.getTime() + 36 * 60_000));
  expect(report.diagnostics).toEqual(expect.arrayContaining(['WORKER_HEARTBEAT_STALE_OR_UNKNOWN', 'FAILED_JOBS_REQUIRE_REVIEW', 'BROADCASTS_REQUIRE_RECONCILIATION']));
  expect(JSON.stringify(report)).not.toContain('private-job'); expect(JSON.stringify(report)).not.toContain('0x');
});
it('keeps RPC and indexer failures unknown with fixed diagnostics', async () => {
  vi.mocked(chain.chainClient).mockReturnValue({ chain: { id: 10143 }, client: { getChainId: async () => { throw new Error('private provider fixture'); } } } as unknown as ReturnType<typeof chain.chainClient>);
  vi.mocked(indexer.processingWatermark).mockRejectedValue(new Error('private GraphQL fixture'));
  const report = await operationalHealth(db, 'hosted', now);
  expect(report).toMatchObject({ healthy: false, rpcReady: false, indexerLagBlocks: null });
  expect(JSON.stringify(report)).not.toContain('private');
});
