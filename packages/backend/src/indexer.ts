import { z } from 'zod';
import { indexedInteger, indexerSyncSchema, type IndexerSync } from '../../domain/src/indexer.js';

const indexedHistorySchema = z.object({
  Timeline: z.array(z.object({ id: z.string(), kind: z.string(), transactionHash: z.string().regex(/^0x[0-9a-f]{64}$/i), blockNumber: indexedInteger, timestamp: indexedInteger,
    logIndex: z.number().int().nonnegative(), actor: z.string().nullable(), amount: indexedInteger.nullable(), own: indexedInteger.nullable(), support: indexedInteger.nullable(), installment: z.number().int().min(0).max(11).nullable(),
  })).max(50),
  Supporter: z.array(z.object({ address: z.string(), contribution: indexedInteger, frozenContribution: indexedInteger, prefix: indexedInteger, claimed: indexedInteger, entitlement: indexedInteger })).max(8),
  Plan_by_pk: z.object({ lifecycle: z.string(), own: indexedInteger, reserve: indexedInteger, used: indexedInteger, paid: indexedInteger, lastBlock: indexedInteger, lastTimestamp: indexedInteger }).nullable(),
});

export async function indexerQuery(query: string, variables: Record<string, unknown>) {
  const url = process.env.ENVIO_GRAPHQL_URL;
  if (!url) throw new Error('INDEXER_NOT_CONFIGURED');
  const target = new URL(url);
  if ((target.protocol !== 'https:' && !(target.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(target.hostname))) || target.username || target.password || target.search || target.hash) throw new Error('INVALID_INDEXER_ENDPOINT');
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (process.env.ENVIO_GRAPHQL_SECRET) headers['x-hasura-admin-secret'] = process.env.ENVIO_GRAPHQL_SECRET;
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ query, variables }), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error('INDEXER_UNAVAILABLE');
  const result = z.object({ data: z.record(z.string(), z.unknown()).optional(), errors: z.unknown().optional() }).parse(await response.json());
  if (result.errors || !result.data) throw new Error('INDEXER_QUERY_FAILED');
  return result.data;
}
export async function history(chainId: number, address: string, offset: number) {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000) throw new Error('INVALID_PAGE');
  const id = `${chainId}:${address.toLowerCase()}`;
  const fields = `
    Timeline(where: {planId: {_eq: $id}}, order_by: [{blockNumber: asc}, {logIndex: asc}], limit: 50, offset: $offset) { id kind transactionHash logIndex blockNumber timestamp actor amount own support installment }
    Supporter(where: {planId: {_eq: $id}}, limit: 8) { address contribution frozenContribution prefix claimed entitlement }
    Plan_by_pk(id: $id) { lifecycle own reserve used paid lastBlock lastTimestamp }
  `;
  let data: Record<string, unknown>;
  try {
    // Fetch history and processing watermark together, rather than using a later sync read.
    data = await indexerQuery(`query History($id: String!, $offset: Int!, $chain: Int!) { ${fields} FallbackSync(where: {chainId: {_eq: $chain}}, limit: 1) { chainId processedBlock sourceBlock } }`, { id, offset, chain: chainId });
  } catch (error) {
    if (!(error instanceof Error) || error.message !== 'INDEXER_QUERY_FAILED') throw error;
    try {
      // Envio Cloud exposes its progress/source watermark as chain_metadata.
      // Read it in the same query as the page, never from a plan's last event.
      data = await indexerQuery(`query History($id: String!, $offset: Int!, $chain: Int!) { ${fields} chain_metadata(where: {chain_id: {_eq: $chain}}, limit: 1) { chain_id latest_processed_block block_height } }`, { id, offset, chain: chainId });
    } catch (hostedError) {
      if (!(hostedError instanceof Error) || hostedError.message !== 'INDEXER_QUERY_FAILED') throw hostedError;
      data = await indexerQuery(`query History($id: String!, $offset: Int!) { ${fields} }`, { id, offset });
    }
  }
  const parsed = indexedHistorySchema.parse(data);
  let sync: IndexerSync | null = null;
  try {
    const hosted = data.chain_metadata === undefined ? undefined : z.array(z.object({ chain_id: z.number().int(), latest_processed_block: z.unknown(), block_height: z.unknown() })).max(1).parse(data.chain_metadata);
    const [row] = z.array(indexerSyncSchema).max(1).parse(data.FallbackSync ?? hosted?.map(m => ({ chainId: m.chain_id, processedBlock: m.latest_processed_block, sourceBlock: m.block_height })));
    if (row?.chainId === chainId) sync = { ...row, observedAt: new Date().toISOString() };
  } catch { /* Legacy/hosted schemas may lack a watermark: expose unknown, never infer it from a plan event. */ }
  return { ...parsed, sync };
}

/** Operational read without loading any private plan or event history. */
export async function processingWatermark(chainId: number): Promise<IndexerSync | null> {
  let data: Record<string, unknown>;
  try {
    data = await indexerQuery('query Watermark($chain: Int!) { FallbackSync(where: {chainId: {_eq: $chain}}, limit: 1) { chainId processedBlock sourceBlock } }', { chain: chainId });
    const [row] = z.array(indexerSyncSchema).max(1).parse(data.FallbackSync);
    return row?.chainId === chainId ? { ...row, observedAt: new Date().toISOString() } : null;
  } catch (error) {
    if (!(error instanceof Error) || error.message !== 'INDEXER_QUERY_FAILED') throw error;
  }
  data = await indexerQuery('query Watermark($chain: Int!) { chain_metadata(where: {chain_id: {_eq: $chain}}, limit: 1) { chain_id latest_processed_block block_height } }', { chain: chainId });
  const [m] = z.array(z.object({ chain_id: z.number().int(), latest_processed_block: z.unknown(), block_height: z.unknown() })).max(1).parse(data.chain_metadata);
  const row = indexerSyncSchema.safeParse(m && { chainId: m.chain_id, processedBlock: m.latest_processed_block, sourceBlock: m.block_height });
  return row.success && row.data.chainId === chainId ? { ...row.data, observedAt: new Date().toISOString() } : null;
}
