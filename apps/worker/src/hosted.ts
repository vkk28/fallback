import { database, closeDatabase } from '../../../packages/backend/src/database.js';
import { chainClient } from '../../../packages/chain/src/client.js';
import { FallbackFactoryAbi } from '../../../packages/chain/src/FallbackFactory.js';
import { discover, workerGateway } from './gateway.js';
import { enqueue, processOne } from './jobs.js';
import { beginWorkerCycle, finishWorkerCycle } from './heartbeat.js';

/** Finite demo batch; job/nonce/receipt handling remains in the existing worker. */
export async function runHostedBatch() {
  if (process.env.HOSTED_WORKER_ENABLED !== 'true') return;
  const chain = chainClient();
  if (chain.chain.id !== 10143 || await chain.client.getChainId() !== 10143) throw new Error('MONAD_TESTNET_WORKER_REQUIRED');
  const count = await chain.client.readContract({ address: chain.factory, abi: FallbackFactoryAbi, functionName: 'planCount' });
  // Refuse a partial registry scan rather than quietly omit later plans.
  if (count > 50n) throw new Error('HOSTED_REGISTRY_SCOPE_TOO_LARGE');
  try {
    const db = database(), gateway = workerGateway(db);
    const runId = await beginWorkerCycle(db, 'hosted');
    try {
      for (const candidate of await discover(0)) await enqueue(db, candidate);
      for (let i = 0; i < 20 && await processOne(db, gateway); i++) { /* bounded batch */ }
      await finishWorkerCycle(db, 'hosted', runId, true);
    } catch {
      await finishWorkerCycle(db, 'hosted', runId, false).catch(() => {});
      throw new Error('HOSTED_WORKER_CYCLE_FAILED');
    }
  } finally { await closeDatabase(); }
}
