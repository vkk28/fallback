import assert from 'node:assert/strict';
import { HttpActionsMock, newTestRuntime, test } from '@chainlink/cre-sdk/test';
import { scheduled, workflowOrigin } from './handler';
import { discoveryPageSize } from '../../packages/domain/src/scheduling';

const batchId = '12345678-1234-4234-8234-123456789012';
const candidates = Array.from({ length: discoveryPageSize }, (_, i) => ({ chainId: 10143, plan: `0x${(i + 1).toString(16).padStart(40, '0')}`, installment: 0, action: 'settleNext' }));
const runtime = () => newTestRuntime(new Map([['main', new Map([['CRE_RELAY_SECRET', 'local-fixture-secret'.repeat(3)]])]]), undefined, { apiOrigin: 'https://fallback.example', schedule: '0 */1 * * * *' });
const response = (value: unknown, statusCode = 200) => ({ statusCode, body: Buffer.from(JSON.stringify(value)).toString('base64') });

test('requests one complete batch in two HTTP calls, including an empty page acknowledgement', () => {
  for (const values of [candidates, []]) {
    const requests: string[] = [], rt = runtime();
    HttpActionsMock.testInstance().sendRequest = request => {
      requests.push(request.url);
      assert.equal(request.cacheSettings?.store, false);
      if (request.method === 'GET') return response({ batchId, candidates: values, scanned: 20, nextCursor: `10143:${candidates[19]!.plan}` });
      assert.equal(request.url, 'https://fallback.example/api/scheduler/enqueue-batch');
      assert.deepEqual(JSON.parse(new TextDecoder().decode(request.body)), { batchId, candidates: values });
      return response({ batchId, status: 'accepted', paid: false, accepted: values.length, stale: 0, scanned: 20, wrapped: false });
    };
    assert.equal(scheduled(rt), values.length);
    assert.equal(requests.length, 2);
    assert.ok(!rt.getLogs().join('\n').includes('local-fixture-secret'));
  }
});

test('rejects oversized, duplicate, wrong-chain or arbitrary-call candidates without truncation', () => {
  for (const invalid of [
    [...candidates, { ...candidates[0], plan: `0x${'f'.repeat(40)}` }],
    [candidates[0], candidates[0]], [{ ...candidates[0], chainId: 1 }],
    [{ ...candidates[0], installment: 12 }], [{ ...candidates[0], action: 'transfer' }],
    [{ ...candidates[0], calldata: '0x1234' }],
  ]) {
    let calls = 0;
    HttpActionsMock.testInstance().sendRequest = () => { calls++; return response({ batchId, candidates: invalid, scanned: 20, nextCursor: null }); };
    assert.throws(() => scheduled(runtime()));
    assert.equal(calls, 1);
  }
});

test('surfaces failed enqueue and rejects an acknowledgement claiming payment or a different batch', () => {
  for (const invalid of [response({}, 503), response({ batchId, status: 'accepted', paid: true, accepted: 20, stale: 0, scanned: 20, wrapped: true }), response({ batchId: '12345678-1234-4234-8234-123456789013', status: 'accepted', paid: false, accepted: 20, stale: 0, scanned: 20, wrapped: true })]) {
    let calls = 0;
    HttpActionsMock.testInstance().sendRequest = request => { calls++; return request.method === 'GET' ? response({ batchId, candidates, scanned: 20, nextCursor: null }) : invalid; };
    assert.throws(() => scheduled(runtime()));
    assert.equal(calls, 2);
  }
});

test('requires a bare HTTPS origin before forwarding the relay credential', () => {
  for (const apiOrigin of ['http://fallback.example', 'https://fallback.example/api', 'https://user:password@fallback.example', 'https://fallback.example?redirect=elsewhere', 'https://fallback.example#fragment']) {
    const rt = runtime(); rt.config.apiOrigin = apiOrigin;
    let calls = 0;
    HttpActionsMock.testInstance().sendRequest = () => { calls++; throw new Error('Must not send'); };
    assert.throws(() => scheduled(rt), /Configured HTTPS adapter/);
    assert.equal(calls, 0);
  }
});

test('validates a bare DNS origin without the Node URL constructor used by WASM', () => {
  const native = globalThis.URL;
  (globalThis as unknown as { URL: unknown }).URL = undefined;
  try {
    assert.equal(workflowOrigin('https://fallback.example:443/'), 'https://fallback.example');
    for (const value of ['https://fallback.example:65536', 'https://-fallback.example', 'https://fallback-.example', 'https://fallback.example/path', 'https://user@fallback.example', 'https://fallback.example?query', 'https://fallback.example#fragment']) assert.throws(() => workflowOrigin(value));
  } finally { globalThis.URL = native; }
});
