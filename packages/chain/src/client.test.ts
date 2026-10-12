import { afterEach, expect, it, vi } from 'vitest';
import { boundedRpcTransport, chainClient } from './client.js';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });
function configured() {
  vi.stubEnv('FACTORY_ADDRESS', `0x${'1'.repeat(40)}`);
  vi.stubEnv('TOKEN_ADDRESS', `0x${'2'.repeat(40)}`);
  vi.stubEnv('CHAIN_ID', '10143');
  vi.stubEnv('MONAD_RPC_URL', 'https://monad-testnet.g.alchemy.com/v2/local-fixture-only');
  return chainClient().client;
}
it('uses the configured server provider and recovers from one throttled request', async () => {
  const transport = vi.fn().mockResolvedValueOnce(new Response('', { status: 429 })).mockResolvedValueOnce(new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x279f' })));
  vi.stubGlobal('fetch', transport);
  expect(await configured().getChainId()).toBe(10143);
  expect(transport).toHaveBeenCalledTimes(2);
  expect(transport.mock.calls[0]![0]).toBe('https://monad-testnet.g.alchemy.com/v2/local-fixture-only');
  expect(transport.mock.calls[0]![1].redirect).toBe('error');
});
it('bounds repeated unavailability without substituting successful data', async () => {
  const transport = vi.fn(async () => new Response('', { status: 503 }));
  vi.stubGlobal('fetch', transport);
  await expect(configured().getBlockNumber()).rejects.toThrow();
  expect(transport).toHaveBeenCalledTimes(2);
});
it('bounds timeout retries and refuses an invented chain result', async () => {
  vi.useFakeTimers();
  const transport = vi.fn(async (_url: string, request: RequestInit) => new Promise<Response>((_resolve, reject) => {
    request.signal!.addEventListener('abort', () => reject(new DOMException('Fixture timeout', 'AbortError')));
  }));
  vi.stubGlobal('fetch', transport);
  const result = expect(configured().getChainId()).rejects.toThrow();
  await vi.runAllTimersAsync();
  await result;
  expect(transport).toHaveBeenCalledTimes(2);
});
it('rejects remote plaintext, credentials and invalid URLs before any RPC request', () => {
  for (const url of ['invalid', 'http://rpc.example.invalid', 'https://user:password@rpc.example.invalid', 'https://rpc.example.invalid/#key']) expect(() => boundedRpcTransport(url)).toThrow('INVALID_RPC_ENDPOINT');
  expect(() => boundedRpcTransport('http://127.0.0.1:8545')).not.toThrow();
});
