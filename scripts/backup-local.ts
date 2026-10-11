import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

// Local application metadata backup plus restoration into a NEW disposable DB.
// Private rows stay under ignored .tools/backups, never in logs or tracked evidence.
const tables = [
  ['accounts', ['id']], ['plans', ['id']], ['memberships', ['plan_id', 'user_id', 'role']],
  ['invitations', ['digest']], ['notifications', ['id']], ['request_keys', ['user_id', 'key']],
  ['invitation_deliveries', ['invitation_id']],
  ['transaction_requests', ['id']], ['request_limits', ['key']], ['settlement_jobs', ['id']], ['scheduler_discovery', ['id']],
  ['setup_drafts', ['user_id']],
] as const;
const root = fileURLToPath(new URL('../', import.meta.url));
process.umask(0o077);
let stage = 'configuration';
const url = new URL(process.env.DATABASE_URL || '');
assert.equal(url.hostname, '127.0.0.1'); assert.equal(url.port, '54329'); assert.equal(url.pathname, '/fallback');
assert.equal(process.env.CHAIN_ID, '10143');
// Drizzle's migrator changes its client's timestamp parsers to return SQL text.
// Preserve that same text on the source, including sub-millisecond precision.
const live = postgres(url.toString(), { max: 1, types: { timestamp: { to: 1184, from: [1082, 1114, 1184], serialize: (value: unknown) => String(value), parse: (value: string) => value } } });
const adminUrl = new URL(url); adminUrl.pathname = '/postgres';
const admin = postgres(adminUrl.toString(), { max: 1 });
const name = `fallback_restore_${randomBytes(6).toString('hex')}`;
let created = false, restore: postgres.Sql | undefined;
try {
  stage = 'consistent_snapshot';
  const snapshot = await live.begin('isolation level repeatable read read only', async tx => {
    const result: Array<{ table: string; columns: string[]; jsonColumns: string[]; rows: Record<string, unknown>[] }> = [];
    for (const [table, keys] of tables) {
      const metadata = await tx`SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=${table} ORDER BY ordinal_position`;
      const columns = metadata.map(r => String(r.column_name));
      // Permit a pre-0007 snapshot before this additive migration is applied.
      if ((table === 'setup_drafts' || table === 'invitation_deliveries') && columns.length === 0) continue;
      const jsonColumns = metadata.filter(r => ['json', 'jsonb'].includes(String(r.data_type))).map(r => String(r.column_name));
      assert.ok(columns.length > 0);
      const rows = await tx`SELECT * FROM ${tx(table)} ORDER BY ${tx([...keys])} LIMIT 100001`;
      assert.ok(rows.length <= 100000, 'BACKUP_SCOPE_TOO_LARGE');
      result.push({ table, columns, jsonColumns, rows: JSON.parse(JSON.stringify(rows)) });
    }
    return { version: 1, capturedAt: new Date().toISOString(), tables: result };
  });
  const bytes = JSON.stringify(snapshot);
  const digest = createHash('sha256').update(bytes).digest('hex');
  const directory = join(root, '.tools/backups', new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomBytes(4).toString('hex'));
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const path = join(directory, 'application.json');
  await writeFile(path, bytes, { mode: 0o600, flag: 'wx' });
  await writeFile(join(directory, 'sha256.txt'), digest + '\n', { mode: 0o600, flag: 'wx' });
  stage = 'read_backup';
  const savedBytes = await readFile(path, 'utf8');
  assert.equal(createHash('sha256').update(savedBytes).digest('hex'), digest);
  const saved: typeof snapshot = JSON.parse(savedBytes);
  stage = 'isolated_restore';
  await admin.unsafe(`CREATE DATABASE "${name}"`); created = true;
  const restoreUrl = new URL(url); restoreUrl.pathname = '/' + name;
  restore = postgres(restoreUrl.toString(), { max: 1 });
  await migrate(drizzle(restore), { migrationsFolder: join(root, 'infra/migrations') });
  const target = restore;
  await target.begin(async tx => {
    for (const table of saved.tables) {
      stage = `restore_${table.table}`;
      for (let offset = 0; offset < table.rows.length; offset += 1000) {
        // Explicit text JSON binds avoid ambiguous object inference during bulk
        // INSERT. PostgreSQL casts each parameter to its declared column type.
        const rows = table.rows.slice(offset, offset + 1000).map(row => Object.fromEntries(table.columns.map(column => [column, table.jsonColumns.includes(column) && row[column] !== null ? JSON.stringify(row[column]) : row[column]]))) as Record<string, string | number | boolean | null>[];
        await tx`INSERT INTO ${tx(table.table)} ${tx(rows, ...table.columns)}`;
      }
    }
  });
  stage = 'restore_verification';
  for (const original of saved.tables) {
    const entry = tables.find(([table]) => table === original.table);
    assert.ok(entry, 'UNKNOWN_BACKUP_TABLE');
    const [table, keys] = entry;
    stage = `verify_${table}`;
    const rows = await target`SELECT ${target(original.columns)} FROM ${target(table)} ORDER BY ${target([...keys])}`;
    const restored = JSON.parse(JSON.stringify(rows)) as Record<string, unknown>[];
    if (JSON.stringify(restored) !== JSON.stringify(original.rows)) {
      console.error(JSON.stringify({ table, sameCount: restored.length === original.rows.length, differingColumns: original.columns.filter(column => JSON.stringify(restored.map(row => row[column])) !== JSON.stringify(original.rows.map(row => row[column]))) }));
    }
    assert.deepEqual(restored, original.rows);
  }
  const evidence = { observedAt: new Date().toISOString(), scope: 'Consistent read-only snapshot of local application metadata; restore only into a newly named disposable PostgreSQL database', tablesVerified: saved.tables.length, rowsVerified: saved.tables.reduce((count, t) => count + t.rows.length, 0), sha256Verified: true, exactDataRestoreVerified: true, backupLocation: 'Ignored .tools/backups; mode 600 files in mode 700 directory', existingDatabaseModified: false, includesCredentials: false, indexerBackupVerified: false, remoteOrScheduledBackupConfigured: false };
  await writeFile(join(root, 'docs/evidence/local-backup.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence));
} catch (error) {
  const code = typeof error === 'object' && error && 'code' in error && /^[A-Z0-9_]{5,40}$/.test(String(error.code)) ? String(error.code) : 'unclassified';
  console.error(`LOCAL_BACKUP_FAILED ${stage} ${code}; no rows, credentials or raw SQL errors logged.`); process.exitCode = 1;
}
finally {
  if (restore) await restore.end();
  if (created) await admin.unsafe(`DROP DATABASE "${name}"`);
  await admin.end(); await live.end();
}
