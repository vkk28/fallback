import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import * as schema from '../packages/backend/src/schema.js';
import { confirmedFundingApproval, outstandingRequest } from '../packages/backend/src/transactions.js';
import { chainClient, planSnapshot } from '../packages/chain/src/client.js';

// Inspect a selected existing plan only. No account signing, submission or new
// requests. The plan argument and account identities never enter public output.
const planId = z.string().uuid().parse(process.argv[2]);
const url = new URL(process.env.DATABASE_URL || '');
if (url.hostname !== '127.0.0.1' || url.port !== '54329' || process.env.CHAIN_ID !== '10143') throw new Error('LOCAL_TESTNET_VERIFICATION_REQUIRED');
const connection = postgres(url.toString(), { max: 1 });
const db = drizzle(connection, { schema });
let stage = 'network';
try {
  const c = chainClient(); assert.equal(await c.client.getChainId(), 10143);
  stage = 'plan_record';
  const plan = await db.query.plans.findFirst({ where: eq(schema.plans.id, planId) });
  assert.ok(plan?.address);
  const before = await db.select({ count: sql<number>`count(*)::int` }).from(schema.transactionRequests).where(eq(schema.transactionRequests.planId, planId));
  stage = 'rpc_snapshot';
  const snapshot = await planSnapshot(plan.address);
  const members = await db.query.memberships.findMany({ where: eq(schema.memberships.planId, planId) });
  const reports = [];
  for (const member of members.filter(m => ['recipient', 'supporter'].includes(m.role))) {
    stage = 'approval_record';
    const account = await db.query.accounts.findFirst({ where: eq(schema.accounts.id, member.userId) });
    const request = await db.query.transactionRequests.findFirst({ where: and(eq(schema.transactionRequests.userId, member.userId), eq(schema.transactionRequests.planId, planId), eq(schema.transactionRequests.action, member.role === 'recipient' ? 'approveOwn' : 'approveSupport'), eq(schema.transactionRequests.status, 'confirmed')) });
    assert.ok(account && request?.walletId);
    const actor = { id: account.id, address: account.address, walletId: request.walletId, sessionId: 'maintenance-funding-recovery' };
    const pending = await outstandingRequest(db, actor.id, planId);
    stage = 'snapshot_allowance';
    const approval = await confirmedFundingApproval(db, actor, planId, snapshot.block);
    reports.push({ role: member.role, outstanding: !!pending, exactApprovalRestored: !!approval, approvedBaseUnits: approval?.amount ?? null });
  }
  const after = await db.select({ count: sql<number>`count(*)::int` }).from(schema.transactionRequests).where(eq(schema.transactionRequests.planId, planId));
  stage = 'request_count_preservation';
  assert.deepEqual(before, after);
  const evidence = { observedAt: new Date().toISOString(), scope: 'Read-only exact-approval recovery on selected existing Monad Testnet plan', lifecycle: snapshot.lifecycle, own: snapshot.own.toString(), reserve: snapshot.reserve.toString(), paid: snapshot.totalPaid.toString(), used: snapshot.used.toString(), block: snapshot.block.toString(), fundingRoles: reports, requestCountBefore: before[0]?.count, requestCountAfter: after[0]?.count, signingOrSubmissionPerformed: false };
  await writeFile('docs/evidence/funding-approval-recovery.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence));
} catch (error) {
  // Inspect raw diagnostics only in memory; export fixed categories, never RPC
  // bodies, arguments, addresses, URLs or credentials.
  const words = String(error).toLowerCase();
  const category = /429|rate.?limit/.test(words) ? 'rpc_rate_limit' : /timeout|timed out/.test(words) ? 'rpc_timeout' : /502|503|bad gateway/.test(words) ? 'rpc_gateway_unavailable' : /execution reverted/.test(words) ? 'rpc_execution_reverted' : 'unclassified';
  console.error(`FUNDING_RECOVERY_VERIFICATION_FAILED ${stage} ${category}; no private identity, signing or submission logged.`); process.exitCode = 1;
} finally { await connection.end(); }
