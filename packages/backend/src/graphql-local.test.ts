import { expect, it } from 'vitest';
import { hasuraSource, indexerTables, localIndexerUrl, readerConnection } from './graphql-local.js';

it('limits container configuration to the separate indexer and secret references', () => {
  const admin = 'postgres://fixture:fixture-password@127.0.0.1:54329/fallback';
  expect(localIndexerUrl(admin).pathname).toBe('/fallback_indexer');
  const url = new URL(readerConnection(admin, 'a'.repeat(64), true));
  expect(url.hostname).toBe('host.docker.internal');
  expect(url.username).toBe('fallback_graphql_reader');
  expect(url.pathname).toBe('/fallback_indexer');
  const source = hasuraSource();
  expect(source.configuration.connection_info.database_url).toEqual({ from_env: 'FALLBACK_INDEXER_READ_URL' });
  expect(source.tables.map(t => t.table.name)).toEqual(indexerTables);
  expect(source.tables.some(t => ['accounts', 'transaction_requests', 'invitations'].includes(t.table.name))).toBe(false);
  expect(JSON.stringify(source)).not.toContain('fixture-password');
});

it('rejects remote/ambiguous database targets and unsafe role-password values', () => {
  for (const url of ['postgres://fixture:password@example.com:54329/fallback', 'postgres://fixture:password@127.0.0.1:5432/fallback', 'postgres://fixture:password@127.0.0.1:54329/fallback?host=elsewhere', 'http://fixture:password@127.0.0.1:54329/fallback']) expect(() => localIndexerUrl(url)).toThrow();
  expect(() => readerConnection('postgres://fixture:password@127.0.0.1:54329/fallback', "'; DROP ROLE fixture; --")).toThrow('INVALID_LOCAL_READER_SECRET');
});
