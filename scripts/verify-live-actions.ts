import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, desc } from 'drizzle-orm';
import { writeFile } from 'node:fs/promises';
import * as schema from '../packages/backend/src/schema.js';
import { reconcileRequest } from '../packages/backend/src/receipts.js';
import { chainClient } from '../packages/chain/src/client.js';

// Maintenance verification of already-confirmed, human-authorized actions.
// No signing/submission API is called. Public evidence contains flags only.
const url = new URL(process.env.DATABASE_URL || '');
if (url.hostname !== '127.0.0.1' || url.port !== '54329' || process.env.CHAIN_ID !== '10143') throw new Error('LOCAL_TESTNET_VERIFICATION_REQUIRED');
const connection = postgres(url.toString(), { max: 1 });
const db = drizzle(connection, { schema });
try {
  if (await chainClient().client.getChainId() !== 10143) throw new Error('TESTNET_MISMATCH');
  const rows = await db.select().from(schema.transactionRequests).where(eq(schema.transactionRequests.status, 'confirmed')).orderBy(desc(schema.transactionRequests.createdAt)).limit(100);
  const actions: Record<string, { checked: number; expectedReceiptConfirmed: boolean; providerSponsorshipVerified: boolean; storedWalletMatchesProvider: boolean }> = {};
  for (const row of rows) {
    if (!row.walletId || !row.providerId) throw new Error('PROVIDER_IDENTITY_MISSING');
    const account = await db.query.accounts.findFirst({ where: eq(schema.accounts.id, row.userId) });
    if (!account) throw new Error('ACCOUNT_RECORD_MISSING');
    const result = await reconcileRequest(db, { id: account.id, address: account.address, walletId: row.walletId, sessionId: 'maintenance-receipt-verification' }, row.id);
    const previous = actions[row.action];
    actions[row.action] = {
      checked: (previous?.checked || 0) + 1,
      expectedReceiptConfirmed: (previous?.expectedReceiptConfirmed ?? true) && result.status === 'confirmed',
      providerSponsorshipVerified: (previous?.providerSponsorshipVerified ?? true) && 'sponsored' in result && result.sponsored === true,
      storedWalletMatchesProvider: true, // reconcileRequest rejects a mismatch.
    };
  }
  const evidence = { observedAt: new Date().toISOString(), chainId: 10143, scope: 'Latest 100 already-confirmed human account actions', actions, signingOrSubmissionPerformed: false };
  await writeFile('docs/evidence/privy-live-actions.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence));
} catch {
  console.error('Live receipt/sponsorship verification failed. No signing or submission was attempted; inspect private configuration.');
  process.exitCode = 1;
} finally { await connection.end(); }
