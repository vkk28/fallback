import { createServer } from 'node:http';
import { once } from 'node:events';
import { it, expect, vi } from 'vitest';
import { stagingRelay } from './staging-relay.js';

it('exposes only exact authenticated scheduler routes, forwarding no wallet/cookie/query headers', async () => {
  const secret = 'local-fixture-relay'.repeat(3), fetcher = vi.fn(async () => new Response(JSON.stringify({ candidates: [] })));
  const server = createServer(stagingRelay({ secret, instance: 'local-fixture', appOrigin: 'http://localhost:3000', fetcher }));
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('Fixture listener unavailable');
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    expect((await fetch(origin + '/health')).status).toBe(200);
    for (const path of ['/api/plans', '/api/transactions', '/api/scheduler/candidates?offset=50', '/api/scheduler/enqueue', '/api/scheduler/health']) expect((await fetch(origin + path)).status).toBe(404);
    expect((await fetch(origin + '/api/scheduler/candidates')).status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
    expect((await fetch(origin + '/api/scheduler/candidates', { headers: { authorization: `Bearer ${secret}`, cookie: 'fixture-private-cookie', 'x-wallet-signature': 'fixture-private-signature' } })).status).toBe(200);
    const input = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(input[0]).toBe('http://localhost:3000/api/scheduler/candidates');
    expect(input[1].headers).toEqual({ authorization: `Bearer ${secret}`, origin: 'http://localhost:3000', 'content-type': 'application/json' });
    expect(input[1].redirect).toBe('error');
    const headers = { authorization: `Bearer ${secret}`, 'content-type': 'application/json' };
    expect((await fetch(origin + '/api/scheduler/enqueue-batch', { method: 'POST', headers, body: 'a'.repeat(8193) })).status).toBe(413);
    expect(fetcher).toHaveBeenCalledTimes(1);
  } finally { server.close(); await once(server, 'close'); }
});
