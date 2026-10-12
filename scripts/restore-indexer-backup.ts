import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import postgres from 'postgres';
process.umask(0o077);
const url = new URL(process.env.DATABASE_URL || '');
assert.equal(url.hostname, '127.0.0.1'); assert.equal(url.port, '54329');
url.pathname = '/postgres';
const admin = postgres(url.toString(), { max: 1, onnotice: () => {} });
const name = `fallback_index_restore_${randomBytes(6).toString('hex')}`;
let created = false, target: ReturnType<typeof postgres> | undefined, directory: string | undefined, stage = 'snapshot';
try {
  const path = process.argv[2] || '.tools/hosting/indexer-snapshot.json';
  const saved = JSON.parse(await readFile(path, 'utf8')) as { capturedAt: string; tables: { table: string; columns: { column_name: string; data_type: string }[]; rows: Record<string, unknown>[] }[] };
  assert.ok(Array.isArray(saved.tables) && saved.tables.length <= 30);
  for (const table of saved.tables) { assert.match(table.table, /^[A-Za-z_][A-Za-z_0-9]*$/); assert.ok(table.rows.length <= 100000); }
  stage = 'isolated_schema';
  await admin.unsafe(`CREATE DATABASE "${name}"`); created = true; url.pathname = '/' + name;
  await mkdir('.tools/indexer-restore', { recursive: true, mode: 0o700 }); directory = await mkdtemp('.tools/indexer-restore/run-');
  const config = JSON.parse(await readFile('indexer/config.fixture.yaml', 'utf8'));
  for (const chain of config.chains) for (const contract of chain.contracts) contract.abi_file_path = resolve('indexer', contract.abi_file_path);
  await writeFile(join(directory, 'config.yaml'), JSON.stringify(config));
  await writeFile(join(directory, 'schema.graphql'), await readFile('indexer/schema.graphql'));
  await mkdir(join(directory, 'src/handlers'), { recursive: true }); await writeFile(join(directory, 'src/handlers/events.ts'), 'export {}; // Schema-only fixture; no chain ingestion.\n');
  const env = { PATH: process.env.PATH!, HOME: process.env.HOME!, ENVIO_PG_HOST: '127.0.0.1', ENVIO_PG_PORT: '54329', ENVIO_PG_USER: decodeURIComponent(url.username), ENVIO_PG_PASSWORD: decodeURIComponent(url.password), ENVIO_PG_DATABASE: name, ENVIO_PG_SCHEMA: 'public', ENVIO_PG_SSL_MODE: 'false', ENVIO_HASURA: 'false', ENVIO_TUI: 'false' };
  async function run(args: string[]) {
    const child = spawn(process.execPath, ['node_modules/envio/bin.mjs', '-d', directory!, ...args], { env, stdio: 'ignore' });
    assert.equal(await new Promise(resolve => { child.once('error', () => resolve(1)); child.once('exit', resolve); }), 0, 'INDEXER_SCHEMA_TOOL_FAILED');
  }
  stage = 'schema_codegen'; await run(['codegen']); stage = 'schema_migration'; await run(['local', 'db-migrate', 'up']);
  target = postgres(url.toString(), { max: 1, onnotice: () => {}, types: { timestamp: { to: 1184, from: [1082, 1114, 1184], serialize: (v: unknown) => String(v), parse: (v: string) => v } } });
  stage = 'restore_data';
  await target.begin(async tx => {
    for (const table of saved.tables) await tx`TRUNCATE TABLE ${tx(table.table)} CASCADE`;
    for (const table of saved.tables) {
      const columns = table.columns.map(c => c.column_name), json = table.columns.filter(c => c.data_type === 'json' || c.data_type === 'jsonb').map(c => c.column_name);
      for (let i = 0; i < table.rows.length; i += 500) {
        const rows = table.rows.slice(i, i + 500).map(row => Object.fromEntries(columns.map(c => {
          const value = row[c];
          if (table.columns.find(m => m.column_name === c)?.data_type === 'bytea' && value !== null) {
            assert.ok(typeof value === 'string' && /^\\x(?:[a-f0-9]{2})*$/i.test(value), 'INVALID_BINARY_SNAPSHOT');
            return [c, Buffer.from(value.slice(2), 'hex')];
          }
          return [c, json.includes(c) && value !== null ? JSON.stringify(value) : value];
        }))) as Record<string, string | number | boolean | null | Buffer>[];
        await tx`INSERT INTO ${tx(table.table)} ${tx(rows, ...columns)}`;
      }
    }
  });
  stage = 'exact_rows';
  let rowsVerified = 0, sequencesReset = 0;
  for (const table of saved.tables) {
    stage = `exact_rows_${table.table}`;
    const columns = table.columns.map(c => c.column_name);
    const rows = await target`SELECT ${target(columns)} FROM ${target(table.table)}` as unknown as Record<string, unknown>[];
    const expectedRows = table.rows.map(row => ({ ...row }));
    for (const column of table.columns.filter(c => c.data_type.startsWith('timestamp'))) {
      const cache = new Map<string, string>();
      for (const row of expectedRows) if (row[column.column_name] !== null) {
        const value = row[column.column_name]; assert.equal(typeof value, 'string');
        if (!cache.has(String(value))) {
          const [cast] = column.data_type === 'timestamp with time zone' ? await target`SELECT ${String(value)}::timestamptz::text AS value` : await target`SELECT ${String(value)}::timestamp::text AS value`;
          cache.set(String(value), String(cast!.value));
        }
        row[column.column_name] = cache.get(String(value));
      }
    }
    const normalized = (values: Record<string, unknown>[]) => values.map(row => JSON.stringify(Object.fromEntries(columns.map(c => {
      let value = row[c];
      // The retained SQL-to-JSON export encoded small numeric values as numbers;
      // postgres.js reads NUMERIC as exact strings. Reject unsafe export numbers
      // before comparing the same database value in its exact decimal form.
      if (['numeric', 'bigint'].includes(table.columns.find(m => m.column_name === c)?.data_type || '') && typeof value === 'number') { assert.ok(Number.isSafeInteger(value), 'IMPRECISE_SNAPSHOT_NUMBER'); value = String(value); }
      if (table.columns.find(m => m.column_name === c)?.data_type === 'bytea' && value instanceof Uint8Array) value = '\\x' + Buffer.from(value).toString('hex');
      return [c, value];
    })))).sort();
    if (JSON.stringify(normalized(rows)) !== JSON.stringify(normalized(expectedRows))) {
      const differingColumns = columns.filter(c => JSON.stringify(rows.map(r => JSON.stringify(r[c])).sort()) !== JSON.stringify(expectedRows.map(r => JSON.stringify(r[c])).sort()));
      console.error(JSON.stringify({ table: table.table, countsMatch: rows.length === table.rows.length, differingColumns: differingColumns.map(c => ({ name: c, sqlType: table.columns.find(m => m.column_name === c)?.data_type, observedKind: typeof rows[0]?.[c], savedKind: typeof expectedRows[0]?.[c] })) }));
    }
    assert.deepEqual(normalized(rows), normalized(expectedRows)); rowsVerified += rows.length;
    for (const c of columns) {
      const [seq] = await target`SELECT pg_get_serial_sequence(${`public."${table.table}"`}, ${c}) AS name`;
      if (seq?.name) {
        await target`SELECT setval(${String(seq.name)}::regclass, coalesce((SELECT max(${target(c)}) FROM ${target(table.table)}), 1), EXISTS(SELECT 1 FROM ${target(table.table)}))`; sequencesReset++;
      }
    }
  }
  const report = { observedAt: new Date().toISOString(), scope: 'Historical retained indexer snapshot restored into a new disposable PostgreSQL database', snapshotCapturedAt: saved.capturedAt, tablesVerified: saved.tables.length, rowsVerified, exactDatabaseValuesVerified: true, safeNumericExportVerified: true, serialSequencesReset: sequencesReset, existingIndexerModified: false, chainIngestionStarted: false, remoteOrScheduledBackupConfigured: false };
  await writeFile('docs/evidence/indexer-backup-restore.json', JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report));
} catch { console.error(`INDEXER_BACKUP_RESTORE_FAILED ${stage}; no rows, credentials or raw SQL logged`); process.exitCode = 1; }
finally {
  if (target) await target.end(); if (created) await admin.unsafe(`DROP DATABASE "${name}" WITH (FORCE)`); await admin.end(); if (directory) await rm(directory, { recursive: true, force: true });
}
