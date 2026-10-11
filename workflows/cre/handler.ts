import { cre, consensusIdenticalAggregation, json, ok, type Runtime, type HTTPSendRequester } from '@chainlink/cre-sdk';
import { discoveryBatchSchema, discoveryResultSchema } from '../../packages/domain/src/scheduling';

export type Config = { apiOrigin: string; schedule: string };
export function workflowOrigin(value: string) {
  // The pinned SDK's bundled URL constructor fails in actual QuickJS simulation.
  // Config accepts a canonical bare HTTPS DNS origin, not arbitrary URLs.
  const match = /^https:\/\/((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?::([1-9]\d{0,4}))?\/?$/.exec(value);
  if (!match || match[1]!.length > 253 || (match[2] && Number(match[2]) > 65535)) throw new Error('Configured HTTPS adapter and secret required');
  return `https://${match[1]}${match[2] && match[2] !== '443' ? ':' + match[2] : ''}`;
}
export function scheduled(runtime: Runtime<Config>) {
  runtime.log('Scheduler stage: preflight');
  const http = new cre.capabilities.HTTPClient();
  runtime.log('Scheduler stage: secret');
  const secret = runtime.getSecret({ id: 'CRE_RELAY_SECRET' }).result().value;
  runtime.log('Scheduler stage: origin');
  const origin = workflowOrigin(runtime.config.apiOrigin);
  if (secret.length < 32) throw new Error('Configured HTTPS adapter and secret required');
  runtime.log('Scheduler stage: discovery');
  const observation = http.sendRequest(runtime, (send: HTTPSendRequester) => {
    const response = send.sendRequest({ url: `${origin}/api/scheduler/candidates`, method: 'GET', headers: { Authorization: `Bearer ${secret}` }, cacheSettings: { store: false, maxAge: '0s' } }).result();
    if (!ok(response)) throw new Error('Discovery service unavailable');
    return JSON.stringify(discoveryBatchSchema.parse(json(response)));
  }, consensusIdenticalAggregation<string>())().result();
  const batch = discoveryBatchSchema.parse(JSON.parse(observation));
  const acknowledgement = http.sendRequest(runtime, (send: HTTPSendRequester) => {
    const response = send.sendRequest({ url: `${origin}/api/scheduler/enqueue-batch`, method: 'POST', headers: { Authorization: `Bearer ${secret}`, Origin: origin, 'Content-Type': 'application/json' }, body: new TextEncoder().encode(JSON.stringify({ batchId: batch.batchId, candidates: batch.candidates })), cacheSettings: { store: false, maxAge: '0s' } }).result();
    // RPC eligibility, idempotent jobs and cursor advancement share one adapter transaction.
    if (!ok(response)) throw new Error('Batch enqueue unavailable; discovery page retained for retry');
    const result = discoveryResultSchema.parse(json(response));
    if (result.batchId !== batch.batchId || result.scanned !== batch.scanned || result.accepted + result.stale !== batch.candidates.length || result.wrapped !== (batch.nextCursor === null)) throw new Error('Invalid batch acknowledgement');
    return JSON.stringify(result);
  }, consensusIdenticalAggregation<string>())().result();
  const result = discoveryResultSchema.parse(JSON.parse(acknowledgement));
  runtime.log(`Scanned ${result.scanned} plans; accepted ${result.accepted} job requests, skipped ${result.stale} stale candidates. Confirmed receipts are required for notifications.`);
  return result.accepted;
}
