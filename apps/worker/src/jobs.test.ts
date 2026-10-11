import { it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import * as schema from '../../../packages/backend/src/schema.js';
import { enqueue, jobId, processOne, type Gateway } from './jobs.js';

it('durably reconciles a submitted receipt after restart without sending twice or duplicate notifications', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fallback-jobs-'));
  let pg = new PGlite(directory), db = drizzle(pg, { schema });
  await migrate(db, { migrationsFolder: 'infra/migrations' });
  const candidate = { chainId: 31337, plan: '0x0000000000000000000000000000000000000100', installment: 0, action: 'settleNext' as const };
  let sends = 0, notifies = 0, confirmed = false;
  const gateway: Gateway = { signer: candidate.plan, inspect: async () => ({ allowed: true, terminal: false }), prepare: async (_, nonce) => ({ hash: `0x${'1'.repeat(64)}`, serialized: '0x1234', nonce }), broadcast: async () => { sends++; return `0x${'1'.repeat(64)}`; }, receipt: async () => confirmed ? 'success' : 'pending', notify: async () => { notifies++; } };
  try {
    await enqueue(db, candidate); await enqueue(db, candidate);
    expect(await db.select().from(schema.jobs)).toHaveLength(1);
    const now = new Date();
    await processOne(db, gateway, now);
    expect(sends).toBe(1); expect(notifies).toBe(0);
    await pg.close();
    pg = new PGlite(directory); db = drizzle(pg, { schema });
    confirmed = true;
    await processOne(db, gateway, new Date(now.getTime() + 6000));
    await processOne(db, gateway, new Date(now.getTime() + 7000));
    expect(sends).toBe(1); expect(notifies).toBe(1);
    expect((await db.select().from(schema.jobs))[0]?.status).toBe('confirmed');
  } finally { await pg.close(); await rm(directory, { recursive: true, force: true }); }
});

it('does not fail a newly persisted receipt identity when an expired lease observes a terminal plan', async () => {
  const pg = new PGlite(), db = drizzle(pg, { schema });
  const candidate = { chainId: 31337, plan: '0x0000000000000000000000000000000000000100', installment: 0, action: 'settleNext' as const };
  const hash = `0x${'2'.repeat(64)}` as const;
  let preparations = 0;
  const gateway: Gateway = { signer: candidate.plan, inspect: async () => {
    // The earlier lease holder has now committed its broadcast identity while
    // this holder was awaiting RPC. Preserve that receipt for reconciliation.
    await db.update(schema.jobs).set({ status: 'submitted', transactionHash: hash }).where(eq(schema.jobs.id, jobId(candidate)));
    return { allowed: false, terminal: true };
  }, prepare: async () => { preparations++; throw new Error('MUST_NOT_RESIGN'); }, broadcast: async () => hash, receipt: async () => 'pending', notify: async () => { throw new Error('MUST_NOT_NOTIFY'); } };
  try {
    await migrate(db, { migrationsFolder: 'infra/migrations' });
    await enqueue(db, candidate); await processOne(db, gateway, new Date(Date.now() + 1000));
    expect((await db.query.jobs.findFirst())?.status).toBe('submitted');
    expect((await db.query.jobs.findFirst())?.transactionHash).toBe(hash);
    expect(preparations).toBe(0);
  } finally { await pg.close(); }
});
