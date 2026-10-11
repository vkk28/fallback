import { relayAuth } from '../../packages/backend/src/security.js';
import { runHostedBatch } from '../../apps/worker/src/hosted.js';

export default async function worker(request: Request) {
  if (request.method !== 'POST' || process.env.HOSTED_WORKER_ENABLED !== 'true') return;
  try { relayAuth(request, process.env.WORKER_TRIGGER_SECRET); } catch { return; }
  try { await runHostedBatch(); }
  catch {
    // Provider/SQL errors may contain credentials. Never forward or log them.
    console.error('Hosted worker batch failed; inspect private configuration and durable job status.');
    throw new Error('HOSTED_WORKER_BATCH_FAILED');
  }
}

export const config = { background: true };
