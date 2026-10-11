import { it, expect, beforeEach, afterEach, vi } from 'vitest';
import { history, indexerQuery } from './indexer.js';
import { indexerCoverage } from '../../domain/src/indexer.js';

const address = '0x0000000000000000000000000000000000000100';
const huge = '340282366920938463463374607431768211455';
const event = { id: 'local-event', kind: 'PaymentSettled', transactionHash: `0x${'1'.repeat(64)}`, blockNumber: '999', timestamp: '1791460000', logIndex: 1, actor: null, amount: huge, own: huge, support: '0', installment: 0 };
const data = () => ({ Timeline: [event], Supporter: [], Plan_by_pk: { lifecycle: 'Active', own: '0', reserve: '0', used: '0', paid: huge, lastBlock: '10', lastTimestamp: '1791450000' }, FallbackSync: [{ chainId: 10143, processedBlock: '999', sourceBlock: '1001' }] });
const result = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
beforeEach(() => { vi.stubEnv('ENVIO_GRAPHQL_URL', 'http://127.0.0.1:8080/v1/graphql'); vi.stubEnv('ENVIO_GRAPHQL_SECRET', 'local-test-secret'); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('keeps large integer money exact and measures completeness from sync rather than a quiet plan event', async () => {
  const fetcher = vi.fn(async () => result({ data: data() })); vi.stubGlobal('fetch', fetcher);
  const value = await history(10143, address, 50);
  expect(value.Timeline[0]?.amount).toBe(huge);
  expect(indexerCoverage(value.sync, '999')).toBe('caught-up');
  expect(indexerCoverage(value.sync, '1000')).toBe('behind');
  expect(fetcher).toHaveBeenCalledTimes(1);
  const request = fetcher.mock.calls[0] as unknown as [string, RequestInit];
  const input = JSON.parse(request[1].body as string);
  expect(input.variables).toEqual({ id: `10143:${address}`, offset: 50, chain: 10143 });
  expect(input.query).toContain('FallbackSync'); expect(input.query).toContain('limit: 50');
  expect(request[1].redirect).toBe('error'); expect(request[1].cache).toBe('no-store');
});

it('retains legacy histories with unknown coverage when runtime watermark is missing', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(result({ errors: [{ message: 'Fixture missing watermark' }] })).mockResolvedValueOnce(result({ data: { ...data(), FallbackSync: undefined } }));
  vi.stubGlobal('fetch', fetcher);
  const value = await history(10143, address, 0);
  expect(value.Timeline).toHaveLength(1); expect(value.sync).toBeNull();
  expect(indexerCoverage(value.sync, '999')).toBe('unknown');
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it('requests every required timeline field from GraphQL, including the receipt log index', async () => {
  // Model GraphQL selection: unlike a canned response, omitted fields are absent.
  // Exercise both the runtime-watermark query and the legacy-schema fallback.
  for (const legacy of [false, true]) {
    const fetcher = vi.fn(async (_url: string, request: RequestInit) => {
      const { query } = JSON.parse(request.body as string) as { query: string };
      if (legacy && query.includes('FallbackSync')) return result({ errors: [{ message: 'Fixture missing watermark' }] });
      const fields = query.match(/offset: \$offset\)\s*\{([^}]+)\}/)?.[1]?.trim().split(/\s+/);
      expect(fields).toBeDefined();
      const selected = Object.fromEntries(Object.entries(event).filter(([key]) => fields!.includes(key)));
      return result({ data: { ...data(), Timeline: [selected], ...(legacy ? { FallbackSync: undefined } : {}) } });
    });
    vi.stubGlobal('fetch', fetcher);
    const value = await history(10143, address, 0);
    expect(value.Timeline[0]).toEqual(event);
    expect(value.Timeline[0]?.logIndex).toBe(1);
    expect(fetcher).toHaveBeenCalledTimes(legacy ? 2 : 1);
  }
});

it('rejects imprecise numeric financial history and treats malformed/wrong-chain watermark as unknown', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => result({ data: { ...data(), Timeline: [{ ...event, amount: Number(huge) }] } })));
  await expect(history(10143, address, 0)).rejects.toThrow();
  for (const sync of [[{ chainId: 1, processedBlock: '999', sourceBlock: '1001' }], [{ chainId: 10143, processedBlock: -1, sourceBlock: '1001' }]]) {
    vi.stubGlobal('fetch', vi.fn(async () => result({ data: { ...data(), FallbackSync: sync } })));
    expect((await history(10143, address, 0)).sync).toBeNull();
  }
});

it('blocks unencrypted remote/credential-bearing endpoints before forwarding the server secret', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  for (const target of ['http://indexer.example/v1/graphql', 'https://user:password@indexer.example/v1/graphql', 'https://indexer.example/v1/graphql?secret=elsewhere', 'https://indexer.example/v1/graphql#fragment']) {
    vi.stubEnv('ENVIO_GRAPHQL_URL', target);
    await expect(indexerQuery('query Fixture { __typename }', {})).rejects.toThrow('INVALID_INDEXER_ENDPOINT');
  }
  expect(fetcher).not.toHaveBeenCalled();
});

it('does not retry transport failure or invent a watermark when the RPC snapshot is missing', async () => {
  const fetcher = vi.fn().mockRejectedValue(new Error('Fixture timeout')); vi.stubGlobal('fetch', fetcher);
  await expect(history(10143, address, 0)).rejects.toThrow('Fixture timeout');
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(indexerCoverage(null, undefined)).toBe('unknown');
});

it('normalizes actual Hasura Int block heights while keeping monetary integers string-only', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => result({ data: { ...data(), FallbackSync: [{ chainId: 10143, processedBlock: 999, sourceBlock: 1001 }] } })));
  const value = await history(10143, address, 0);
  expect(value.sync?.processedBlock).toBe('999'); expect(value.sync?.sourceBlock).toBe('1001');
  expect(indexerCoverage(value.sync, '1000')).toBe('behind');
});
