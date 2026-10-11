import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
const root = fileURLToPath(new URL('../', import.meta.url));
process.loadEnvFile(root + '.env');
const u = new URL(process.env.DATABASE_URL);
if (u.hostname !== '127.0.0.1' || u.port !== '54329' || process.env.CHAIN_ID !== '10143') throw new Error('Dedicated local PostgreSQL and Monad testnet required');
const configuredDatabase = u.pathname; u.pathname = '/postgres';
const admin = postgres(u.toString(), { max: 1 });
const exists = await admin`SELECT 1 FROM pg_database WHERE datname='fallback_indexer'`;
if (!exists.length) await admin.unsafe('CREATE DATABASE fallback_indexer');
await admin.end();u.pathname = configuredDatabase;
const env = { ...process.env, ENVIO_PG_HOST: '127.0.0.1', ENVIO_PG_PORT: '54329', ENVIO_PG_USER: decodeURIComponent(u.username), ENVIO_PG_PASSWORD: decodeURIComponent(u.password), ENVIO_PG_DATABASE: 'fallback_indexer', ENVIO_PG_SCHEMA: 'public', ENVIO_PG_SSL_MODE: 'false', ENVIO_HASURA: 'false', ENVIO_TUI: 'false', ENVIO_INDEXER_PORT: '9898', NODE_ENV: 'development' };
function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
    // Native logs can include RPC/SQL parameters. Report fixed lifecycle status only.
    child.stdout.on('data', () => {}); child.stderr.on('data', () => {});
    const stop = () => child.kill('SIGTERM'); process.on('SIGTERM', stop); process.on('SIGINT', stop);
    child.on('error', () => reject(new Error('Indexer tool could not launch')));
    child.on('exit', code => { process.off('SIGTERM', stop); process.off('SIGINT', stop); if (code === 0) resolve(); else reject(new Error('Indexer tool failed; inspect configuration privately')); });
  });
}
await run([root + 'scripts/indexer-config.mjs', '--rpc']);
await run([root + 'node_modules/envio/bin.mjs', '-d', 'indexer', 'codegen']);
await run([root + 'node_modules/envio/bin.mjs', '-d', 'indexer', 'local', 'db-migrate', 'up']);
console.log('Envio headless RPC indexer starting against isolated fallback_indexer database. Hasura/GraphQL is not enabled.');
// Explicit runtime confinement, scoped to this owned child and its descendants.
env.NODE_OPTIONS = `--import=${root}scripts/indexer-loopback.mjs`;
await run([root + 'node_modules/envio/bin.mjs', '-d', 'indexer', 'start']);
