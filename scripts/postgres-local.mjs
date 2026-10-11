import EmbeddedPostgres from 'embedded-postgres';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, appendFileSync, chmodSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
process.umask(0o077); // Also protects the upstream helper's temporary password file.
process.loadEnvFile(root + '.env');
let connection = process.env.DATABASE_URL;
if (!connection) {
  const password = randomBytes(32).toString('hex');
  connection = `postgres://fallback:${password}@127.0.0.1:54329/fallback`;
  appendFileSync(root + '.env', `\nDATABASE_URL=${connection}\n`); chmodSync(root + '.env', 0o600);
}
const url = new URL(connection);
if (url.hostname !== '127.0.0.1' || url.port !== '54329') throw new Error('Use configured external database; this helper only manages the project loopback cluster on 54329.');
mkdirSync(root + '.tools/pg-sockets', { recursive: true, mode: 0o700 });
const pg = new EmbeddedPostgres({ databaseDir: root + 'infra/data/postgres', user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), port: 54329, persistent: true, authMethod: 'scram-sha-256', createPostgresUser: false, postgresFlags: ['-h', '127.0.0.1', '-k', root + '.tools/pg-sockets'], onLog: () => {}, onError: () => {} });
try {
  if (!existsSync(root + 'infra/data/postgres/PG_VERSION')) await pg.initialise();
  await pg.start();
  const client = pg.getPgClient('postgres', '127.0.0.1'); await client.connect();
  const database = decodeURIComponent(url.pathname.slice(1));
  if (!/^[a-z][a-z0-9_]*$/.test(database)) throw new Error('Invalid local database name');
  const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
  if (exists.rowCount === 0) await client.query(`CREATE DATABASE "${database}"`);
  await client.end();
  console.log('Project PostgreSQL is ready on loopback port 54329. Its URL is stored only in ignored .env.');
} catch { console.error('Local PostgreSQL startup failed; no raw configuration logged.'); process.exitCode = 1; }
let stopping = false;
async function stop() { if (stopping) return; stopping = true; await pg.stop(); process.exit(0); }
process.on('SIGINT', stop); process.on('SIGTERM', stop);
