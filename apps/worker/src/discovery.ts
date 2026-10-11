import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Database } from '../../../packages/backend/src/database.js';
import { schedulerDiscovery } from '../../../packages/backend/src/schema.js';
import { ApiError } from '../../../packages/backend/src/security.js';
import { discoveryBatchSchema, discoveryResultSchema, enqueueBatchSchema, type DiscoveryBatch, type DiscoveryResult } from '../../../packages/domain/src/scheduling.js';
import { enqueue, type Candidate } from './jobs.js';

type Page = Omit<DiscoveryBatch, 'batchId'>;
export type DiscoverySource = (cursor: string | null) => Promise<Page>;

/** Freeze one page for all DON observations; failed runs keep it across restarts. */
export async function discoveryBatch(db: Database, id: string, source: DiscoverySource): Promise<DiscoveryBatch> {
  return db.transaction(async tx => {
    await tx.insert(schedulerDiscovery).values({ id }).onConflictDoNothing();
    const [scan] = await tx.select().from(schedulerDiscovery).where(eq(schedulerDiscovery.id, id)).for('update');
    if (!scan) throw new Error('DISCOVERY_STATE_UNAVAILABLE');
    if (scan.batch) return discoveryBatchSchema.parse(scan.batch);
    const batch = discoveryBatchSchema.parse({ ...await source(scan.cursor), batchId: randomUUID() });
    await tx.update(schedulerDiscovery).set({ batch }).where(eq(schedulerDiscovery.id, id));
    return batch;
  });
}

/** Enqueue and advance atomically. Repeated node submissions return the same acknowledgement. */
export async function enqueueDiscoveryBatch(db: Database, id: string, value: unknown, inspect: (candidate: Candidate) => Promise<{ allowed: boolean }>): Promise<DiscoveryResult> {
  const input = enqueueBatchSchema.parse(value);
  return db.transaction(async tx => {
    const [scan] = await tx.select().from(schedulerDiscovery).where(eq(schedulerDiscovery.id, id)).for('update');
    if (!scan) throw new ApiError(409, 'STALE_DISCOVERY_BATCH');
    if (scan.completed?.batch.batchId === input.batchId) {
      if (JSON.stringify(discoveryBatchSchema.parse(scan.completed.batch).candidates) !== JSON.stringify(input.candidates)) throw new ApiError(409, 'STALE_DISCOVERY_BATCH');
      return discoveryResultSchema.parse(scan.completed.result);
    }
    const batch = scan.batch && discoveryBatchSchema.parse(scan.batch);
    if (!batch || batch.batchId !== input.batchId || JSON.stringify(batch.candidates) !== JSON.stringify(input.candidates)) throw new ApiError(409, 'STALE_DISCOVERY_BATCH');
    let accepted = 0, stale = 0;
    for (const candidate of batch.candidates) {
      if (!(await inspect(candidate)).allowed) { stale++; continue; }
      await enqueue(tx, candidate); accepted++;
    }
    const result: DiscoveryResult = { batchId: batch.batchId, status: 'accepted', paid: false, accepted, stale, scanned: batch.scanned, wrapped: batch.nextCursor === null };
    await tx.update(schedulerDiscovery).set({ cursor: batch.nextCursor, batch: null, completed: { batch, result } }).where(eq(schedulerDiscovery.id, id));
    return result;
  });
}
