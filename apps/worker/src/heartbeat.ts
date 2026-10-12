import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { Database } from '../../../packages/backend/src/database.js';
import { workerHeartbeat } from '../../../packages/backend/src/schema.js';
export async function beginWorkerCycle(db: Database, mode: 'hosted' | 'local', now = new Date()) {
  const runId = randomUUID();
  await db.insert(workerHeartbeat).values({ mode, runId, startedAt: now, status: 'running' }).onConflictDoUpdate({ target: workerHeartbeat.mode, set: { runId, startedAt: now, finishedAt: null, status: 'running' } });
  return runId;
}
export async function finishWorkerCycle(db: Database, mode: 'hosted' | 'local', runId: string, succeeded: boolean, now = new Date()) {
  // A delayed former process cannot overwrite the newer cycle's heartbeat.
  await db.update(workerHeartbeat).set({ finishedAt: now, status: succeeded ? 'succeeded' : 'failed', ...(succeeded ? { lastSuccessAt: now } : {}) }).where(and(eq(workerHeartbeat.mode, mode), eq(workerHeartbeat.runId, runId)));
}
