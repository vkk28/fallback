import { z } from 'zod';

export const indexedInteger = z.string().regex(/^(0|[1-9]\d*)$/).max(80);
const blockHeight = z.union([indexedInteger, z.number().int().nonnegative().safe().transform(value => value.toString())]);
export const indexerSyncSchema = z.object({
  chainId: z.number().int().positive(), processedBlock: blockHeight, sourceBlock: blockHeight,
}).strict().refine(row => BigInt(row.processedBlock) <= BigInt(row.sourceBlock));
export type IndexerSync = z.infer<typeof indexerSyncSchema> & { observedAt: string };
export function indexerCoverage(sync: IndexerSync | null | undefined, snapshotBlock: string | undefined) {
  if (!sync || !snapshotBlock || !indexedInteger.safeParse(snapshotBlock).success) return 'unknown';
  return BigInt(sync.processedBlock) >= BigInt(snapshotBlock) ? 'caught-up' : 'behind';
}
