import { and, eq, notInArray } from 'drizzle-orm';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { writeFile } from 'node:fs/promises';
import * as schema from '../packages/backend/src/schema.js';
import { privyClient } from '../packages/backend/src/auth.js';
import { reconcileRequest } from '../packages/backend/src/receipts.js';

// Recover only existing provider-identified requests. Never sign, submit, replace,
// clear, or infer failure from elapsed time/allowance. Evidence excludes identities.
const url = new URL(process.env.DATABASE_URL || '');
if (url.hostname !== '127.0.0.1' || url.port !== '54329' || process.env.CHAIN_ID !== '10143') throw new Error('LOCAL_TESTNET_VERIFICATION_REQUIRED');
const connection = postgres(url.toString(), { max: 1 });
const db = drizzle(connection, { schema });
try {
  const rows = await db.query.transactionRequests.findMany({ where: notInArray(schema.transactionRequests.status, ['confirmed', 'failed']), limit: 21 });
  if (rows.length > 20) throw new Error('PENDING_VERIFICATION_BOUND_EXCEEDED');
  const reports = [];
  for (const row of rows) {
    if (!row.providerId || !row.walletId) {
      reports.push({ action: row.action, storedStatus: row.status, reconciliation: 'provider identity unavailable; preserved' });
      continue;
    }
    const account = await db.query.accounts.findFirst({ where: eq(schema.accounts.id, row.userId) });
    if (!account) throw new Error('ACCOUNT_RECORD_MISSING');
    const tx = await privyClient().transactions().get(row.providerId);
    if (tx.wallet_id !== row.walletId || tx.caip2 !== 'eip155:10143' || (tx.reference_id && tx.reference_id !== row.id)) throw new Error('PROVIDER_IDENTITY_MISMATCH');
    const result = await reconcileRequest(db, { id: account.id, address: account.address, walletId: row.walletId, sessionId: 'maintenance-receipt-recovery' }, row.id);
    const stored = await db.query.transactionRequests.findFirst({ where: and(eq(schema.transactionRequests.id, row.id), eq(schema.transactionRequests.userId, row.userId)) });
    reports.push({ action: row.action, storedStatus: stored?.status, providerStatus: tx.status, hasHash: !!result.hash, sponsored: tx.sponsored ?? null, ageSeconds: Math.floor((Date.now() - row.createdAt.getTime()) / 1000), reconciledStatus: result.status });
  }
  const evidence = { observedAt: new Date().toISOString(), scope: 'Existing unresolved Monad Testnet requests only', requests: reports, signingOrSubmissionPerformed: false };
  await writeFile('docs/evidence/pending-actions-reconciliation.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence));
} catch {
  console.error('PENDING_ACTION_RECONCILIATION_FAILED; existing requests preserved, no signing or submission attempted.');
  process.exitCode = 1;
} finally { await connection.end(); }
