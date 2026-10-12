import { eq, sql } from 'drizzle-orm';
import type { Database } from './database.js';
import { jobs, workerHeartbeat } from './schema.js';
import { chainClient } from '../../chain/src/client.js';
import { processingWatermark } from './indexer.js';

export function operationalQueue(db: Database, now: Date) {
  // Raw SQL parameters do not inherit the timestamp column's Date encoder.
  // Bind explicit ISO text so the real postgres.js driver can serialize it.
  return db.select({ status: jobs.status, count: sql<number>`count(*)::int`, unresolvedBroadcasts: sql<number>`count(*) filter (where ${jobs.transactionHash} is not null and ${jobs.status} not in ('confirmed','failed'))::int`, overdue: sql<number>`count(*) filter (where ${jobs.nextAttempt} < ${now.toISOString()}::timestamptz and ${jobs.status} in ('queued','submitted'))::int` }).from(jobs).groupBy(jobs.status);
}

export async function operationalHealth(db: Database, mode: 'hosted' | 'local' = 'hosted', now = new Date()) {
  const c = chainClient();
  const results = await Promise.allSettled([
    (async () => { const id = await c.client.getChainId(); if (id !== c.chain.id) throw new Error('CHAIN_MISMATCH'); return c.client.getBlockNumber(); })(),
    processingWatermark(c.chain.id),
    operationalQueue(db, now),
    db.query.workerHeartbeat.findFirst({ where: eq(workerHeartbeat.mode, mode) }),
  ]);
  const [rpc, indexer, queue, heartbeat] = results;
  const head = rpc!.status === 'fulfilled' ? rpc!.value : null;
  const sync = indexer!.status === 'fulfilled' ? indexer!.value : null;
  const groups = queue!.status === 'fulfilled' ? queue!.value : null;
  const beat = heartbeat!.status === 'fulfilled' ? heartbeat!.value : null;
  const lag = head !== null && sync && BigInt(sync.processedBlock) <= head ? (head - BigInt(sync.processedBlock)).toString() : null;
  const workerAge = beat?.lastSuccessAt ? Math.max(0, Math.floor((now.getTime() - beat.lastSuccessAt.getTime()) / 1000)) : null;
  const unresolved = groups?.reduce((n, g) => n + g.unresolvedBroadcasts, 0) ?? null;
  const diagnostics: string[] = [];
  if (head === null) diagnostics.push('RPC_UNAVAILABLE_OR_WRONG_CHAIN');
  if (!sync || lag === null) diagnostics.push('INDEXER_COVERAGE_UNKNOWN');
  else if (BigInt(lag) > 100n) diagnostics.push('INDEXER_BEHIND');
  if (!groups) diagnostics.push('QUEUE_UNAVAILABLE');
  if (groups?.some(g => g.status === 'failed' && g.count > 0)) diagnostics.push('FAILED_JOBS_REQUIRE_REVIEW');
  if (unresolved) diagnostics.push('BROADCASTS_REQUIRE_RECONCILIATION');
  if (workerAge === null || workerAge > (mode === 'hosted' ? 35 * 60 : 60)) diagnostics.push('WORKER_HEARTBEAT_STALE_OR_UNKNOWN');
  if (beat?.status === 'failed') diagnostics.push('WORKER_LAST_CYCLE_FAILED');
  return { observedAt: now.toISOString(), healthy: diagnostics.length === 0, rpcReady: head !== null, chainId: c.chain.id, indexerLagBlocks: lag, worker: beat ? { mode, status: beat.status, startedAt: beat.startedAt.toISOString(), finishedAt: beat.finishedAt?.toISOString() || null, lastSuccessAt: beat.lastSuccessAt?.toISOString() || null, secondsSinceSuccess: workerAge } : null, queue: groups, unresolvedBroadcasts: unresolved, diagnostics };
}
