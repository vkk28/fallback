import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { encodeAbiParameters, encodeEventTopics } from 'viem';
import * as schema from './schema.js';
import type { Database } from './database.js';
import * as chain from '../../chain/src/client.js';
import { FallbackPlanAbi } from '../../chain/src/FallbackPlan.js';
import { createDraft } from './plans.js';
import { reconcileNotificationPage } from './notification-reconciliation.js';
const actor = { id: 'reorg-fixture', address: `0x${'1'.repeat(40)}` };
const address = `0x${'3'.repeat(40)}`, hash = `0x${'4'.repeat(64)}`, blockHash = `0x${'5'.repeat(64)}`;
const id = `10143:${hash}:1:${actor.id}`;
const receipt = vi.fn(), block = vi.fn();
let pg: PGlite, db: Database, planId: string;
beforeEach(async () => {
  pg = new PGlite(); db = drizzle(pg, { schema });
  await migrate(drizzle(pg, { schema }), { migrationsFolder: 'infra/migrations' });
  planId = (await db.transaction(tx => createDraft(tx, actor, { label: 'Local reorg fixture', payee: `0x${'2'.repeat(40)}`, terms: { amount: '1000000', minimumReserve: '1000000', maximumReserve: '2000000', perPaymentCap: '1000000', firstDue: '1800000000', interval: '86400', grace: '3600', fundingDeadline: '1795000000', coverBps: 10000, count: 1 } }))).id;
  await db.insert(schema.notifications).values({ id, userId: actor.id, planId, type: 'Closed', transactionHash: hash });
  receipt.mockReset().mockResolvedValue({ transactionHash: hash, blockNumber: 20n, blockHash, status: 'success', logs: [{ address, logIndex: 1, topics: encodeEventTopics({ abi: FallbackPlanAbi, eventName: 'Closed' }), data: encodeAbiParameters([{ type: 'uint8' }, { type: 'uint256' }, { type: 'uint256' }], [2, 1n, 2n]) }] });
  block.mockReset().mockResolvedValue({ hash: blockHash });
  vi.spyOn(chain, 'chainClient').mockReturnValue({ chain: { id: 10143 }, client: { getChainId: async () => 10143, getTransactionReceipt: receipt, getBlock: block } } as unknown as ReturnType<typeof chain.chainClient>);
});
afterEach(async () => { vi.restoreAllMocks(); await pg.close(); });
const row = () => ({ id, planId, type: 'Closed', transactionHash: hash, address, chainId: 10143 });
it('removes an orphaned success claim and restores a canonical re-mined event without duplication', async () => {
  block.mockResolvedValueOnce({ hash: `0x${'6'.repeat(64)}` });
  expect((await reconcileNotificationPage(db, actor.id, [row()])).get(id)).toEqual({ type: 'ReceiptReorged', verification: 'orphaned' });
  expect((await db.query.notifications.findFirst())?.type).toBe('ReceiptReorged');
  expect((await reconcileNotificationPage(db, actor.id, [{ ...row(), type: 'ReceiptReorged' }])).get(id)).toEqual({ type: 'Closed', verification: 'canonical' });
  await reconcileNotificationPage(db, actor.id, [row()]);
  expect(await db.query.notifications.findMany()).toHaveLength(1);
});
it('keeps unavailable receipts unknown without destroying evidence and isolates actor updates', async () => {
  receipt.mockRejectedValueOnce(new Error('Fixture outage'));
  expect((await reconcileNotificationPage(db, actor.id, [row()])).get(id)?.verification).toBe('unavailable');
  expect((await db.query.notifications.findFirst())?.type).toBe('Closed');
  block.mockResolvedValue({ hash: `0x${'6'.repeat(64)}` });
  await reconcileNotificationPage(db, 'another-actor', [row()]);
  expect((await db.query.notifications.findFirst({ where: eq(schema.notifications.id, id) }))?.type).toBe('Closed');
});
it('does not count a changed log identity as the old event and bounds a page', async () => {
  const changed = await receipt(); changed.logs[0].logIndex = 2; receipt.mockResolvedValue(changed);
  expect((await reconcileNotificationPage(db, actor.id, [row()])).get(id)?.verification).toBe('orphaned');
  await expect(reconcileNotificationPage(db, actor.id, Array(21).fill(row()))).rejects.toThrow('NOTIFICATION_PAGE_BOUND');
});
