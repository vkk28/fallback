import assert from 'node:assert/strict';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { readerConnection, indexerTables } from '../packages/backend/src/graphql-local.js';

const root = fileURLToPath(new URL('../', import.meta.url)), directory = root + '.tools/graphql/';
process.loadEnvFile(root + '.env');
let db: postgres.Sql | undefined;
let stage = 'configuration';
try {
  const password = (await readFile(directory + 'reader-password', 'utf8')).trim();
  db = postgres(readerConnection(process.env.DATABASE_URL || '', password), { max: 1 });
  stage = 'role_flags';
  const roles = await db`SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls FROM pg_roles WHERE rolname=current_user`;
  assert.equal(roles.length, 1); assert.ok(Object.values(roles[0]!).every(value => value === false));
  stage = 'read_only';
  const readonly = await db`SHOW transaction_read_only`; assert.equal(readonly[0]?.transaction_read_only, 'on');
  stage = 'table_grants';
  for (const table of indexerTables) {
    const permissions = await db`SELECT has_table_privilege(current_user, ${'public."' + table + '"'}, 'SELECT') AS readable, has_table_privilege(current_user, ${'public."' + table + '"'}, 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS writable`;
    assert.equal(permissions[0]?.readable, true); assert.equal(permissions[0]?.writable, false);
  }
  stage = 'schema_grants';
  const create = await db`SELECT has_schema_privilege(current_user, 'public', 'CREATE') AS allowed`;
  assert.equal(create[0]?.allowed, false);
  stage = 'sync_query';
  const metadata = await db`SELECT chain_id, latest_processed_block, block_height, num_events_processed::text FROM chain_metadata WHERE chain_id=10143`;
  assert.equal(metadata.length, 1);
  stage = 'file_permissions';
  const privateFiles = ['reader-password', 'admin-secret', 'metadata-password', 'metadata-url', 'docker.env', 'owner-marker'];
  for (const name of privateFiles) assert.equal((await stat(directory + name)).mode & 0o777, 0o600);
  const evidence = { observedAt: new Date().toISOString(), runtime: 'Actual PostgreSQL18.4 dedicated query account; Hasura container not required for these checks', tablesReadable: indexerTables.length, tableWritesAllowed: false, schemaCreationAllowed: false, transactionReadOnly: true, privilegedRoleFlags: false, privateFilesMode600: true, measuredIndexerProgress: metadata.map(r => ({ chainId: r.chain_id, processedBlock: String(r.latest_processed_block), sourceBlock: String(r.block_height), eventsProcessed: r.num_events_processed })), graphQLRuntimeVerified: false };
  await writeFile(root + 'docs/evidence/graphql-readiness.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence));
} catch { console.error('GRAPHQL_READER_VERIFICATION_FAILED:', stage, '; no raw SQL, configuration or credentials logged.'); process.exitCode = 1; }
finally { await db?.end(); }
