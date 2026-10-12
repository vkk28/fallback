import { and, eq, isNull, lte, or, sql } from 'drizzle-orm';
import type { Hex } from 'viem';
import type { Database } from '../../../packages/backend/src/database.js';
import { jobs } from '../../../packages/backend/src/schema.js';

export type Action = 'settleNext' | 'expireNext' | 'closeFunding';
export type Candidate = { chainId: number; plan: string; installment: number; action: Action };
export const jobId = (c: Candidate) => `${c.chainId}:${c.plan.toLowerCase()}:${c.installment}:${c.action}`;
export async function enqueue(db: Database, c: Candidate) {
  if (![10143, 31337].includes(c.chainId) || c.installment < 0 || c.installment > 12) throw new Error('INVALID_JOB');
  await db.insert(jobs).values({ ...c, plan: c.plan.toLowerCase(), id: jobId(c) }).onConflictDoNothing();
}
export async function takeJob(db: Database, now = new Date()) {
  return db.transaction(async tx => {
    const available = or(isNull(jobs.leaseUntil), lte(jobs.leaseUntil, now));
    const [job] = await tx.select().from(jobs).where(and(lte(jobs.nextAttempt, now), or(eq(jobs.status, 'queued'), and(eq(jobs.status, 'submitted'), available), and(eq(jobs.status, 'leased'), available)))).orderBy(jobs.nextAttempt).limit(1).for('update', { skipLocked: true });
    if (!job) return null;
    const leaseUntil = new Date(now.getTime() + 60_000);
    await tx.update(jobs).set({ status: 'leased', leaseUntil }).where(eq(jobs.id, job.id));
    return { ...job, leaseUntil };
  });
}
export interface Gateway {
  signer: string;
  inspect(c: Candidate): Promise<{ allowed: boolean; terminal: boolean }>;
  prepare(c: Candidate, nonceFloor: number): Promise<{ hash: Hex; serialized: Hex; nonce: number }>;
  broadcast(serialized: Hex): Promise<Hex>;
  receipt(hash: Hex): Promise<'pending' | 'success' | 'reverted'>;
  notify(plan: string, hash: Hex): Promise<void>;
}
export async function processOne(db: Database, gateway: Gateway, now = new Date()) {
  const job = await takeJob(db, now);
  if (!job) return false;
  const owned = and(eq(jobs.id, job.id), eq(jobs.leaseUntil, job.leaseUntil));
  try {
    let stored: typeof jobs.$inferSelect = job;
    let hash = job.transactionHash as Hex | null;
    if (!hash) {
      const state = await gateway.inspect(job);
      if (state.terminal) {
        await db.update(jobs).set({ status: 'failed', leaseUntil: null }).where(and(owned, isNull(jobs.transactionHash)));
        return true; // Another caller resolved it; do not invent a receipt or a paid notification.
      }
      if (!state.allowed) throw new Error('NOT_CURRENTLY_PAYABLE');
      // Serialize nonce reservations across jobs/processes, and commit the exact
      // signed call BEFORE any network broadcast. A lost response or crash can
      // then only retry those same bytes, never sign a second payment attempt.
      stored = await db.transaction(async tx => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`worker:${job.chainId}:${gateway.signer.toLowerCase()}`}, 0))`);
        const [current] = await tx.select().from(jobs).where(eq(jobs.id, job.id)).for('update');
        if (!current) throw new Error('JOB_NOT_FOUND');
        if (current.transactionHash) return current;
        if (current.leaseUntil?.getTime() !== job.leaseUntil.getTime()) throw new Error('JOB_LEASE_CHANGED');
        const [reserved] = await tx.select({ nonce: sql<number>`coalesce(max(${jobs.nonce}), -1)::int` }).from(jobs).where(and(eq(jobs.chainId, job.chainId), eq(jobs.signer, gateway.signer.toLowerCase())));
        const prepared = await gateway.prepare(job, (reserved?.nonce ?? -1) + 1);
        const [saved] = await tx.update(jobs).set({ transactionHash: prepared.hash, signedTransaction: prepared.serialized, signer: gateway.signer.toLowerCase(), nonce: prepared.nonce, status: 'submitted' }).where(eq(jobs.id, job.id)).returning();
        if (!saved) throw new Error('JOB_STORAGE_FAILED');
        return saved;
      });
      hash = stored.transactionHash as Hex;
    }
    let receipt = await gateway.receipt(hash);
    if (receipt === 'pending' && stored.signedTransaction) {
      // Even if the RPC accepted the first submission before losing its response,
      // the identical nonce/hash remains idempotent at the chain. Reconcile first.
      try {
        const returned = await gateway.broadcast(stored.signedTransaction as Hex);
        if (returned.toLowerCase() !== hash.toLowerCase()) throw new Error('BROADCAST_HASH_MISMATCH');
      } catch {
        // Already-known/nonce-too-low/transport errors are not proof of failure.
        // The persisted identity is retained for receipt recovery.
      }
      receipt = await gateway.receipt(hash);
    }
    if (receipt === 'pending') {
      await db.update(jobs).set({ status: 'submitted', attempts: job.attempts + 1, leaseUntil: null, nextAttempt: new Date(now.getTime() + Math.min(300_000, 5000 * 2 ** Math.min(job.attempts, 6))) }).where(owned);
    } else if (receipt === 'success') {
      await gateway.notify(job.plan, hash); // Idempotent per log/user; retry after crash safely.
      await db.update(jobs).set({ status: 'confirmed', leaseUntil: null }).where(owned);
    } else {
      await db.update(jobs).set({ status: 'failed', leaseUntil: null, attempts: job.attempts + 1 }).where(owned);
    }
  } catch {
    const attempts = job.attempts + 1;
    // Existing submitted hashes must be reconciled, never replaced blindly.
    const row = await db.query.jobs.findFirst({ where: eq(jobs.id, job.id) });
    await db.update(jobs).set({ attempts, status: row?.transactionHash ? 'submitted' : attempts >= 8 ? 'failed' : 'queued', leaseUntil: null, nextAttempt: new Date(now.getTime() + Math.min(300_000, 1000 * 2 ** attempts)) }).where(owned);
  }
  return true;
}
export async function queueHealth(db: Database) {
  return db.select({ status: jobs.status, count: sql<number>`count(*)::int` }).from(jobs).groupBy(jobs.status);
}
