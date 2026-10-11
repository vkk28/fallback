import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

// Restore only a verified private snapshot into this task's NEW Neon database.
// No data reset, secret/row output, financial signing or implicit worker startup.
const order = ['accounts', 'plans', 'memberships', 'invitations', 'notifications', 'request_keys', 'invitation_deliveries', 'transaction_requests', 'request_limits', 'settlement_jobs', 'scheduler_discovery', 'setup_drafts'];
const sortKeys: Record<string, string[]> = { accounts: ['id'], plans: ['id'], memberships: ['plan_id', 'user_id', 'role'], invitations: ['digest'], notifications: ['id'], request_keys: ['user_id', 'key'], invitation_deliveries: ['invitation_id'], transaction_requests: ['id'], request_limits: ['key'], settlement_jobs: ['id'], scheduler_discovery: ['id'], setup_drafts: ['user_id'] };
type Entry = { table: string; columns: string[]; jsonColumns: string[]; rows: Record<string, unknown>[] };
process.umask(0o077);
let stage = 'configuration', client: ReturnType<typeof postgres> | undefined;
try {
  const snapshotPath = process.argv[2]; assert.ok(snapshotPath, 'PRIVATE_SNAPSHOT_REQUIRED');
  const raw = await readFile(snapshotPath, 'utf8');
  const expectedHash = (await readFile(join(dirname(snapshotPath), 'sha256.txt'), 'utf8')).trim();
  assert.equal(createHash('sha256').update(raw).digest('hex'), expectedHash);
  const saved = JSON.parse(raw) as { version: number; tables: Entry[] };
  assert.equal(saved.version, 1); assert.deepEqual(saved.tables.map(t => t.table), order);
  const credentialPath = '.tools/hosting/neon.json';
  const credentials = JSON.parse(await readFile(credentialPath, 'utf8')) as { ownerDatabaseUrl: string; applicationDatabaseUrl?: string };
  const target = new URL(credentials.ownerDatabaseUrl);
  assert.equal(target.hostname, 'ep-dry-glade-b4dfofov.c-6.us-east-2.aws.neon.tech');
  assert.equal(target.pathname, '/fallback');
  target.searchParams.set('sslmode', 'verify-full');
  credentials.ownerDatabaseUrl = target.toString();
  client = postgres(target.toString(), { max: 1, connect_timeout: 20, ssl: { rejectUnauthorized: true }, types: { timestamp: { to: 1184, from: [1082, 1114, 1184], serialize: (value: unknown) => String(value), parse: (value: string) => value } } });
  const sql = client;
  stage = 'empty_target';
  const existing = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`;
  if (existing.length === 0) {
    stage = 'migrations';
    await migrate(drizzle(sql), { migrationsFolder: 'infra/migrations' });
  } else {
    assert.deepEqual(existing.map(row => String(row.table_name)).sort(), [...order].sort());
  }
  const counts = await Promise.all(saved.tables.map(async table => Number((await sql`SELECT count(*)::int AS count FROM ${sql(table.table)}`)[0]?.count)));
  if (counts.every(count => count === 0)) {
    stage = 'restore';
    await sql.begin(async tx => {
      for (const table of saved.tables) {
        assert.equal((await tx`SELECT count(*)::int AS count FROM ${tx(table.table)}`)[0]?.count, 0);
        for (let offset = 0; offset < table.rows.length; offset += 1000) {
          const rows = table.rows.slice(offset, offset + 1000).map(row => Object.fromEntries(table.columns.map(column => [column, table.jsonColumns.includes(column) && row[column] !== null ? JSON.stringify(row[column]) : row[column]]))) as Record<string, string | number | boolean | null>[];
          await tx`INSERT INTO ${tx(table.table)} ${tx(rows, ...table.columns)}`;
        }
      }
    });
  }
  // Existing data is verification-only. Never clear or replace it on retries.
  stage = 'exact_verification';
  for (const table of saved.tables) {
    stage = `exact_verification_${table.table}`;
    const rows = await sql`SELECT ${sql(table.columns)} FROM ${sql(table.table)} ORDER BY ${sql(sortKeys[table.table]!)}`;
    const restored = JSON.parse(JSON.stringify(rows)) as Record<string, unknown>[];
    const temporalColumns = (await sql`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=${table.table} AND data_type='timestamp with time zone'`).map(row => String(row.column_name));
    const compare = (a: Record<string, unknown>, b: Record<string, unknown>) => {
      for (const key of sortKeys[table.table]!) {
        const left = String(a[key]), right = String(b[key]);
        if (left !== right) return left < right ? -1 : 1;
      }
      return 0;
    };
    // Locale/collation can differ across servers; match exact rows by primary key.
    restored.sort(compare); const expected = [...table.rows].sort(compare);
    // Compare PostgreSQL timestamps at full stored precision, independent of the
    // driver's display/parser format. Never reduce them to JS milliseconds.
    for (let index = 0; index < expected.length; index++) {
      const original = expected[index]!;
      const keys = sortKeys[table.table]!;
      let where = sql`${sql(keys[0]!)}=${original[keys[0]!] as string}`;
      for (const key of keys.slice(1)) where = sql`${where} AND ${sql(key)}=${original[key] as string}`;
      for (const column of temporalColumns) {
        const [match] = await sql`SELECT ${sql(column)} IS NOT DISTINCT FROM ${original[column] as string | null}::timestamptz AS matched FROM ${sql(table.table)} WHERE ${where}`;
        assert.equal(match?.matched, true, 'TIMESTAMP_RESTORE_MISMATCH');
        // Row identity and every other field still compare exactly below.
        if (restored[index]) restored[index]![column] = original[column];
      }
    }
    try { assert.deepEqual(restored, expected); }
    catch {
      console.error(JSON.stringify({ table: table.table, sameCount: restored.length === expected.length, differingColumns: table.columns.filter(column => JSON.stringify(restored.map(row => row[column])) !== JSON.stringify(expected.map(row => row[column]))) }));
      throw new Error('RESTORE_VERIFICATION_FAILED');
    }
  }
  stage = 'application_role';
  const [role] = await sql`SELECT 1 FROM pg_roles WHERE rolname='fallback_app'`;
  if (!role) {
    const password = randomBytes(32).toString('hex');
    // Only generated lowercase hex enters this DDL; never a client-provided string.
    await sql.unsafe(`CREATE ROLE fallback_app LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`);
    const application = new URL(target); application.username = 'fallback_app'; application.password = password;
    credentials.applicationDatabaseUrl = application.toString();
    await writeFile(credentialPath, JSON.stringify(credentials), { mode: 0o600 });
  }
  assert.ok(credentials.applicationDatabaseUrl, 'APPLICATION_ROLE_CREDENTIAL_REQUIRED');
  await sql`REVOKE CREATE ON SCHEMA public FROM PUBLIC`;
  await sql`GRANT CONNECT ON DATABASE fallback TO fallback_app`;
  await sql`GRANT USAGE ON SCHEMA public TO fallback_app`;
  await sql`GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO fallback_app`;
  // Setup completion removes only the actor/version-matched preliminary draft.
  // Payment requests and financial journal rows have no DELETE permission.
  await sql`GRANT DELETE ON setup_drafts TO fallback_app`;
  await sql`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO fallback_app`;
  await sql`ALTER ROLE fallback_app SET statement_timeout='20s'`;
  await sql`ALTER ROLE fallback_app SET idle_in_transaction_session_timeout='30s'`;
  const app = postgres(credentials.applicationDatabaseUrl, { max: 1, ssl: { rejectUnauthorized: true } });
  try {
    await app.begin(async tx => { await tx`SELECT pg_advisory_xact_lock(1)`; await tx`SELECT id FROM accounts LIMIT 1`; });
    const [permissions] = await app`SELECT has_schema_privilege(current_user,'public','CREATE') AS schema_create, has_table_privilege(current_user,'transaction_requests','DELETE') AS request_delete`;
    assert.equal(permissions?.schema_create, false); assert.equal(permissions?.request_delete, false);
  } finally { await app.end(); }
  const report = { observedAt: new Date().toISOString(), tablesVerified: saved.tables.length, rowsVerified: saved.tables.reduce((n, t) => n + t.rows.length, 0), exactRestoreVerified: true, certificateVerificationRequired: true, applicationRoleVerified: true, workerEnabled: false, sourceDatabaseModified: false };
  await writeFile('.tools/hosting/restore-evidence.json', JSON.stringify(report), { mode: 0o600 });
  console.log(JSON.stringify(report));
} catch {
  console.error(`HOSTED_RESTORE_FAILED ${stage}; no rows, credentials or raw SQL errors logged.`);
  process.exitCode = 1;
} finally { if (client) await client.end(); }
