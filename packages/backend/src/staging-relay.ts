import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

type Options = { secret: string; instance: string; appOrigin: string; fetcher?: typeof fetch };
export function stagingRelay({ secret, instance, appOrigin, fetcher = fetch }: Options) {
  if (secret.length < 32 || appOrigin !== 'http://localhost:3000') throw new Error('LOCAL_SCHEDULER_RELAY_CONFIG_REQUIRED');
  return async (request: IncomingMessage, response: ServerResponse) => {
    const reply = (status: number, value: unknown) => { response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'connection': 'close' }); response.end(JSON.stringify(value)); };
    if (request.method === 'GET' && request.url === '/health') { reply(200, { service: 'fallback-scheduler-relay', instance }); return; }
    const route = request.method === 'GET' && request.url === '/api/scheduler/candidates' ? 'candidates' : request.method === 'POST' && request.url === '/api/scheduler/enqueue-batch' ? 'enqueue-batch' : null;
    if (!route) { reply(404, { error: 'NOT_FOUND' }); return; }
    const authorization = request.headers.authorization;
    const expected = `Bearer ${secret}`;
    if (!authorization || Buffer.byteLength(authorization) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(authorization), Buffer.from(expected))) { request.resume(); reply(401, { error: 'RELAY_UNAUTHORIZED' }); return; }
    try {
      const buffers: Buffer[] = []; let bytes = 0;
      if (request.method === 'POST') {
        if (!request.headers['content-type']?.startsWith('application/json')) { reply(415, { error: 'JSON_REQUIRED' }); return; }
        for await (const chunk of request) { bytes += chunk.length; if (bytes > 8192) { reply(413, { error: 'BODY_TOO_LARGE' }); return; } buffers.push(Buffer.from(chunk)); }
      }
      const upstream = await fetcher(`${appOrigin}/api/scheduler/${route}`, { method: route === 'candidates' ? 'GET' : 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(45_000), headers: { authorization: expected, origin: appOrigin, 'content-type': 'application/json' }, ...(route === 'enqueue-batch' ? { body: Buffer.concat(buffers) } : {}) });
      const value = await upstream.json();
      reply(upstream.status, value);
    } catch { reply(503, { error: 'SCHEDULER_ADAPTER_UNAVAILABLE' }); }
  };
}
