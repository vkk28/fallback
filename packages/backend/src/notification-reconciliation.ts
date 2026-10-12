import { and, eq } from 'drizzle-orm';
import { parseEventLogs, type Hex } from 'viem';
import { chainClient } from '../../chain/src/client.js';
import { FallbackPlanAbi } from '../../chain/src/FallbackPlan.js';
import type { Database } from './database.js';
import { notifications } from './schema.js';

export type NotificationReceipt = { id: string; planId: string; transactionHash: string | null; type: string; address: string | null; chainId: number };
export type NotificationVerification = 'canonical' | 'orphaned' | 'unavailable' | 'offchain';
/** Bounded read-page reconciliation. RPC failure never proves an orphan or success. */
export async function reconcileNotificationPage(db: Database, actorId: string, rows: NotificationReceipt[]) {
  if (rows.length > 20) throw new Error('NOTIFICATION_PAGE_BOUND');
  const results = new Map<string, { type: string; verification: NotificationVerification }>();
  const groups = new Map<string, NotificationReceipt[]>();
  for (const row of rows) {
    results.set(row.id, { type: row.type, verification: row.transactionHash ? 'unavailable' : 'offchain' });
    if (row.transactionHash && row.address) {
      const key = `${row.chainId}:${row.address}:${row.transactionHash}`;
      groups.set(key, [...groups.get(key) || [], row]);
    }
  }
  if (!groups.size) return results;
  const c = chainClient();
  try { if (await c.client.getChainId() !== c.chain.id) return results; } catch { return results; }
  const batches = [...groups.values()];
  for (let i = 0; i < batches.length; i += 2) await Promise.all(batches.slice(i, i + 2).map(async group => {
    const first = group[0]!;
    if (first.chainId !== c.chain.id || !/^0x[a-f0-9]{64}$/i.test(first.transactionHash!)) return;
    try {
      const receipt = await c.client.getTransactionReceipt({ hash: first.transactionHash as Hex });
      const block = await c.client.getBlock({ blockNumber: receipt.blockNumber });
      if (receipt.transactionHash.toLowerCase() !== first.transactionHash!.toLowerCase()) return;
      const canonical = receipt.blockHash === block.hash && receipt.status === 'success';
      const events = canonical ? parseEventLogs({ abi: FallbackPlanAbi, logs: receipt.logs, strict: true }).filter(e => e.address.toLowerCase() === first.address!.toLowerCase()) : [];
      for (const row of group) {
        const event = events.find(e => row.id === `${c.chain.id}:${first.transactionHash}:${e.logIndex}:${actorId}`);
        const type = event?.eventName || 'ReceiptReorged';
        if (type !== row.type) await db.update(notifications).set({ type }).where(and(eq(notifications.id, row.id), eq(notifications.userId, actorId), eq(notifications.transactionHash, first.transactionHash!)));
        results.set(row.id, { type, verification: event ? 'canonical' : 'orphaned' });
      }
    } catch { /* Preserve records, report unavailable, retry on a later read. */ }
  }));
  return results;
}
