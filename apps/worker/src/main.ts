import { database } from '../../../packages/backend/src/database.js';
import { discover, workerGateway } from './gateway.js';
import { enqueue, processOne } from './jobs.js';
import { chainClient } from '../../../packages/chain/src/client.js';
import { FallbackFactoryAbi } from '../../../packages/chain/src/FallbackFactory.js';
import { beginWorkerCycle, finishWorkerCycle } from './heartbeat.js';

let running = true;
process.on('SIGTERM', () => { running = false; });
process.on('SIGINT', () => { running = false; });
const configured = chainClient();
if (configured.chain.id !== 10143 || await configured.client.getChainId().catch(() => 0) !== 10143) throw new Error('MONAD_TESTNET_WORKER_REQUIRED');
const db = database(), gateway = workerGateway(db);
console.log('Dedicated Monad testnet worker started; only fixed permissionless plan actions are enabled.');
let offset = 0;
while (running) {
  let runId: string | undefined;
  try {
    runId = await beginWorkerCycle(db, 'local');
    const candidates = await discover(offset);
    for (const c of candidates) await enqueue(db, c);
    offset += 50;
    const chain = chainClient();
    const total = await chain.client.readContract({ address: chain.factory, abi: FallbackFactoryAbi, functionName: 'planCount' });
    if (offset >= Number(total)) offset = 0;
    for (let i = 0; i < 20 && running && await processOne(db, gateway); i++) { /* bounded batch */ }
    await finishWorkerCycle(db, 'local', runId, true);
  } catch {
    if (runId) await finishWorkerCycle(db, 'local', runId, false).catch(() => {});
    console.error('Worker cycle failed; backing off. Check private configuration and health.');
  }
  await new Promise(resolve => setTimeout(resolve, 5000));
}
process.exit(0);
