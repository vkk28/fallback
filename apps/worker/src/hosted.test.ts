import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const fixtures = vi.hoisted(() => ({
  database: vi.fn(), close: vi.fn(), getChainId: vi.fn(), readContract: vi.fn(),
  discover: vi.fn(), gateway: vi.fn(), enqueue: vi.fn(), processOne: vi.fn(),
}));
vi.mock('../../../packages/backend/src/database.js', () => ({ database: fixtures.database, closeDatabase: fixtures.close }));
vi.mock('../../../packages/chain/src/client.js', () => ({ chainClient: () => ({ chain: { id: 10143 }, client: { getChainId: fixtures.getChainId, readContract: fixtures.readContract }, factory: '0x0000000000000000000000000000000000000001' }) }));
vi.mock('./gateway.js', () => ({ discover: fixtures.discover, workerGateway: fixtures.gateway }));
vi.mock('./jobs.js', () => ({ enqueue: fixtures.enqueue, processOne: fixtures.processOne }));
vi.mock('./heartbeat.js', () => ({ beginWorkerCycle: async () => 'fixture-cycle', finishWorkerCycle: async () => {} }));
import { runHostedBatch } from './hosted.js';
import worker from '../../../netlify/functions/worker-background.js';
import trigger from '../../../netlify/functions/worker-trigger.js';

const fixtureSecret = 'local-test-worker-trigger-secret-0001';
beforeEach(() => {
  vi.clearAllMocks();
  fixtures.database.mockReturnValue({}); fixtures.gateway.mockReturnValue({});
  fixtures.close.mockResolvedValue(undefined); fixtures.getChainId.mockResolvedValue(10143);
  fixtures.readContract.mockResolvedValue(3n); fixtures.discover.mockResolvedValue([]);
  fixtures.processOne.mockResolvedValue(false);
  vi.stubEnv('HOSTED_WORKER_ENABLED', 'true'); vi.stubEnv('WORKER_TRIGGER_SECRET', fixtureSecret);
  vi.stubEnv('APP_ORIGIN', 'https://fallback-fixture.netlify.app');
  vi.stubEnv('URL', 'https://fallback-fixture.netlify.app');
  vi.stubEnv('HEALTH_MONITOR_ENABLED', 'false');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('keeps staging disabled without opening a database or constructing a signer', async () => {
  vi.stubEnv('HOSTED_WORKER_ENABLED', 'false');
  await runHostedBatch(); await worker(new Request('https://fallback-fixture.netlify.app', { method: 'POST' }));
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher); await trigger();
  expect(fixtures.database).not.toHaveBeenCalled(); expect(fixtures.gateway).not.toHaveBeenCalled();
  expect(fixtures.getChainId).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
});

it('rejects unauthenticated and wrong-method background invocations before chain or database access', async () => {
  for (const method of ['GET', 'POST']) await worker(new Request('https://fallback-fixture.netlify.app', { method }));
  await worker(new Request('https://fallback-fixture.netlify.app', { method: 'POST', headers: { authorization: 'Bearer incorrect-local-test-secret-0001' } }));
  expect(fixtures.getChainId).not.toHaveBeenCalled(); expect(fixtures.database).not.toHaveBeenCalled();
});

it('rejects chain mismatch and oversized scans before constructing a signer', async () => {
  fixtures.getChainId.mockResolvedValueOnce(1);
  await expect(runHostedBatch()).rejects.toThrow('MONAD_TESTNET_WORKER_REQUIRED');
  fixtures.readContract.mockResolvedValueOnce(51n);
  await expect(runHostedBatch()).rejects.toThrow('HOSTED_REGISTRY_SCOPE_TOO_LARGE');
  expect(fixtures.database).not.toHaveBeenCalled(); expect(fixtures.gateway).not.toHaveBeenCalled();
});

it('closes worker database sessions after success or a failed batch', async () => {
  await worker(new Request('https://fallback-fixture.netlify.app', { method: 'POST', headers: { authorization: `Bearer ${fixtureSecret}` } }));
  expect(fixtures.close).toHaveBeenCalledTimes(1);
  fixtures.discover.mockRejectedValueOnce(new Error('private provider diagnostic'));
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  await expect(worker(new Request('https://fallback-fixture.netlify.app', { method: 'POST', headers: { authorization: `Bearer ${fixtureSecret}` } }))).rejects.toThrow('HOSTED_WORKER_BATCH_FAILED');
  expect(fixtures.close).toHaveBeenCalledTimes(2);
  expect(log.mock.calls.flat().join(' ')).not.toContain('private provider diagnostic');
});

it('does not send the trigger credential to unapproved origins or redirects', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 202 })); vi.stubGlobal('fetch', fetcher);
  vi.stubEnv('APP_ORIGIN', 'https://unapproved.example');
  await expect(trigger()).rejects.toThrow('HOSTED_WORKER_ORIGIN_REJECTED');
  expect(fetcher).not.toHaveBeenCalled();
  vi.stubEnv('APP_ORIGIN', 'https://fallback-fixture.netlify.app'); await trigger();
  expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ method: 'POST', redirect: 'error' });
  fetcher.mockRejectedValueOnce(new Error('private transport diagnostic'));
  await expect(trigger()).rejects.toThrow(/^WORKER_TRIGGER_FAILED$/);
});
it('monitors private aggregate health after scheduling and logs only fixed diagnostics', async () => {
  vi.stubEnv('HEALTH_MONITOR_ENABLED', 'true'); vi.stubEnv('CRE_RELAY_SECRET', 'fixture-relay-secret-for-health-0001');
  const fetcher = vi.fn().mockResolvedValueOnce(new Response(null, { status: 202 })).mockResolvedValueOnce(new Response(JSON.stringify({ healthy: true })));
  vi.stubGlobal('fetch', fetcher);
  await trigger();
  expect(fetcher.mock.calls[1]![0].pathname).toBe('/api/scheduler/operations');
  expect(fetcher.mock.calls[1]![1]).toMatchObject({ redirect: 'error', cache: 'no-store' });
  fetcher.mockResolvedValueOnce(new Response(null, { status: 202 })).mockResolvedValueOnce(new Response(JSON.stringify({ healthy: false, diagnostics: ['INDEXER_BEHIND', 'private-provider-error-or-key'] })));
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  await expect(trigger()).rejects.toThrow('HEALTH_MONITOR_FAILED');
  expect(log.mock.calls.flat().join(' ')).toContain('INDEXER_BEHIND');
  expect(log.mock.calls.flat().join(' ')).not.toContain('private-provider');
});
