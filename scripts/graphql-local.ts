import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createConnection } from 'node:net';
import { existsSync } from 'node:fs';
import postgres from 'postgres';
import { localIndexerUrl, readerConnection, prepareIndexerReader, hasuraSource } from '../packages/backend/src/graphql-local.js';

const root = fileURLToPath(new URL('../', import.meta.url)), directory = root + '.tools/graphql/';
const operation = process.argv[2] || 'status', origin = 'http://127.0.0.1:8080';
if (!['prepare', 'start', 'status', 'stop'].includes(operation)) throw new Error('Use prepare|start|status|stop');
process.umask(0o077);
process.loadEnvFile(root + '.env');
const dockerEnv = Object.fromEntries(['PATH', 'HOME', 'DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_CONFIG', 'TMPDIR'].flatMap(k => process.env[k] ? [[k, process.env[k]!]] : []));
const desktopCli = '/Applications/Docker.app/Contents/Resources/bin/docker';
const dockerCommand = process.platform === 'darwin' && existsSync(desktopCli) ? desktopCli : 'docker';
if (dockerCommand === desktopCli) dockerEnv.PATH = '/Applications/Docker.app/Contents/Resources/bin:' + (dockerEnv.PATH || '/usr/bin:/bin');
let stage = 'preflight';
function docker(args: string[]) {
  const result = spawnSync(dockerCommand, args, { cwd: root, env: dockerEnv, encoding: 'utf8', timeout: 120_000 });
  if (result.error || result.status !== 0) {
    if (/docker-credential.*not found|executable file not found/i.test(result.stderr || '')) throw new Error('DOCKER_CREDENTIAL_HELPER_REQUIRED');
    if (/manifest unknown|manifest.*not found|unknown blob/i.test(result.stderr || '')) throw new Error('PINNED_CONTAINER_IMAGE_UNAVAILABLE');
    throw new Error(args[0] === 'info' ? 'DOCKER_ENGINE_REQUIRED' : 'LOCAL_GRAPHQL_CONTAINER_COMMAND_FAILED');
  }
  return result.stdout;
}
async function secret(name: string) {
  try { const value = (await readFile(directory + name, 'utf8')).trim(); if (!/^[a-f0-9]{64}$/.test(value)) throw new Error('INVALID_PRIVATE_GRAPHQL_CONFIGURATION'); return { value, existing: true }; }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; const value = randomBytes(32).toString('hex'); await writeFile(directory + name, value + '\n', { mode: 0o600, flag: 'wx' }); return { value, existing: false }; }
}
async function prepare() {
  const adminUrl = process.env.DATABASE_URL || '';
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const reader = await secret('reader-password'), admin = await secret('admin-secret'), metadata = await secret('metadata-password'), owner = await secret('owner-marker');
  const db = postgres(localIndexerUrl(adminUrl).toString(), { max: 1, onnotice: () => {} });
  try {
    const roles = await db`SELECT 1 FROM pg_roles WHERE rolname='fallback_graphql_reader'`;
    // Prove persisted credentials before changing an existing role's grants/settings.
    if (roles.length && reader.existing) {
      const authenticated = postgres(readerConnection(adminUrl, reader.value), { max: 1 });
      try { await authenticated`SELECT 1`; } finally { await authenticated.end(); }
    }
    await prepareIndexerReader(db, reader.value, reader.existing);
  } finally { await db.end(); }
  const readDb = postgres(readerConnection(adminUrl, reader.value), { max: 1 });
  try { await readDb`SELECT count(*) FROM "Plan"`; } finally { await readDb.end(); }
  await writeFile(directory + 'metadata-url', `postgresql://fallback_hasura:${metadata.value}@metadata:5432/fallback_hasura\n`, { mode: 0o600 });
  await writeFile(directory + 'docker.env', `FALLBACK_HASURA_ADMIN_SECRET=${admin.value}\nFALLBACK_INDEXER_READ_URL=${readerConnection(adminUrl, reader.value, true)}\nFALLBACK_GRAPHQL_OWNER=${owner.value}\n`, { mode: 0o600 });
  await chmod(directory + 'docker.env', 0o600);
  return admin.value;
}
async function metadata(secretValue: string, value: unknown) {
  const response = await fetch(origin + '/v1/metadata', { method: 'POST', headers: { 'content-type': 'application/json', 'x-hasura-admin-secret': secretValue }, body: JSON.stringify(value), signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error('LOCAL_GRAPHQL_METADATA_FAILED');
  return response.json();
}
const compose = ['compose', '-p', 'fallback-graphql', '-f', root + 'infra/hasura.compose.yaml', '--env-file', directory + 'docker.env'];
async function ownedContainers() {
  const marker = (await readFile(directory + 'owner-marker', 'utf8')).trim();
  const ids = docker([...compose, 'ps', '--all', '--quiet']).trim().split('\n').filter(Boolean);
  if (!ids.length) return false;
  const containers = JSON.parse(docker(['inspect', ...ids]));
  if (containers.some((container: { Config: { Labels: Record<string, string> } }) => container.Config.Labels['io.fallback.graphql.owner'] !== marker || container.Config.Labels['com.docker.compose.project.config_files'] !== root + 'infra/hasura.compose.yaml')) throw new Error('UNRELATED_GRAPHQL_CONTAINERS_PRESERVED');
  return true;
}
function listening() {
  return new Promise<boolean>(resolve => {
    const socket = createConnection({ host: '127.0.0.1', port: 8080 });
    const done = (value: boolean) => { socket.destroy(); resolve(value); };
    socket.once('connect', () => done(true)); socket.once('error', () => done(false)); socket.setTimeout(1000, () => done(false));
  });
}
try {
  if (operation === 'prepare') {
    await prepare(); console.log('Local reader/config prepared; secrets are ignored mode600 files. GraphQL runtime and app settings remain unchanged.');
  } else {
    docker(['info', '--format', '{{.ServerVersion}}']);
    if (operation === 'stop') { if (await ownedContainers()) docker([...compose, 'stop']); console.log('Project GraphQL containers stopped; database volumes preserved.'); }
    else if (operation === 'status') {
      const owned = await ownedContainers();
      const response = await fetch(origin + '/healthz?strict=true', { signal: AbortSignal.timeout(5000) }).catch(() => null);
      console.log(JSON.stringify({ dockerReady: true, owned, graphQLHealthy: owned && !!response?.ok, appConfigured: process.env.ENVIO_GRAPHQL_URL === origin + '/v1/graphql' }));
    } else {
      if (process.env.ENVIO_GRAPHQL_URL && process.env.ENVIO_GRAPHQL_URL !== origin + '/v1/graphql') throw new Error('EXISTING_GRAPHQL_ENDPOINT_PRESERVED');
      stage = 'prepare'; const admin = await prepare();
      stage = 'ownership';
      const owned = await ownedContainers();
      if (await listening() && !owned) throw new Error('UNRELATED_GRAPHQL_LISTENER_PRESERVED');
      stage = 'compose_validation'; docker([...compose, 'config', '--quiet']);
      stage = 'compose_start'; docker([...compose, 'up', '-d']);
      stage = 'health';
      let healthy = false;
      for (let i = 0; i < 30; i++) {
        const response = await fetch(origin + '/healthz', { signal: AbortSignal.timeout(2000) }).catch(() => null);
        if (response?.ok) { healthy = true; break; }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      if (!healthy) throw new Error('LOCAL_GRAPHQL_STARTUP_UNVERIFIED');
      stage = 'metadata'; const current = await metadata(admin, { type: 'export_metadata', args: {} });
      if (current.sources?.some((source: { name: string }) => source.name !== 'fallback_indexer')) throw new Error('UNRELATED_HASURA_SOURCE_PRESERVED');
      const source = hasuraSource();
      if (current.sources?.length && JSON.stringify(current.sources[0].configuration?.connection_info?.database_url) !== JSON.stringify(source.configuration.connection_info.database_url)) throw new Error('UNRELATED_HASURA_SOURCE_PRESERVED');
      // Add/track only this named source; no clear_metadata, replace_metadata or DB reset.
      if (!current.sources?.length) await metadata(admin, { type: 'pg_add_source', args: { name: source.name, configuration: source.configuration } });
      const tracked = current.sources?.find((s: { name: string }) => s.name === source.name)?.tables || [];
      for (const table of source.tables) {
        if (!tracked.some((t: { table: { name: string; schema: string } }) => t.table.name === table.table.name && t.table.schema === 'public')) await metadata(admin, { type: 'pg_track_table', args: { source: source.name, ...table } });
      }
      // Hasura can retain an inconsistent source after PostgreSQL was offline.
      // Reconnect this owned source without replacing metadata or resetting data.
      stage = 'reload_source';
      await metadata(admin, { type: 'reload_metadata', args: { reload_sources: [source.name], reload_remote_schemas: false } });
      stage = 'query';
      const response = await fetch(origin + '/v1/graphql', { method: 'POST', headers: { 'content-type': 'application/json', 'x-hasura-admin-secret': admin }, body: JSON.stringify({ query: 'query Ready { Plan(limit: 1) { id } FallbackSync(limit: 1) { chainId processedBlock sourceBlock } }' }), signal: AbortSignal.timeout(10_000) });
      const data = await response.json();
      if (!response.ok || data.errors || !Array.isArray(data.data?.Plan) || !Array.isArray(data.data?.FallbackSync)) throw new Error('LOCAL_GRAPHQL_QUERY_UNVERIFIED');
      const envPath = root + '.env', old = await readFile(envPath, 'utf8');
      if (process.env.ENVIO_GRAPHQL_URL && process.env.ENVIO_GRAPHQL_URL !== origin + '/v1/graphql') throw new Error('EXISTING_GRAPHQL_ENDPOINT_PRESERVED');
      const preserved = old.split('\n').filter(line => !/^(ENVIO_GRAPHQL_URL|ENVIO_GRAPHQL_SECRET)=/.test(line)).join('\n');
      await writeFile(envPath, preserved + `\nENVIO_GRAPHQL_URL=${origin}/v1/graphql\nENVIO_GRAPHQL_SECRET=${admin}\n`, { mode: 0o600 }); await chmod(envPath, 0o600);
      console.log('Actual local GraphQL query verified. Endpoint/secret configured privately; restart owned web/worker when no human authorization is active.');
    }
  }
} catch (error) {
  const allowed = ['DOCKER_ENGINE_REQUIRED', 'DOCKER_CREDENTIAL_HELPER_REQUIRED', 'PINNED_CONTAINER_IMAGE_UNAVAILABLE', 'LOCAL_GRAPHQL_CONTAINER_COMMAND_FAILED', 'EXISTING_GRAPHQL_ENDPOINT_PRESERVED', 'UNRELATED_HASURA_SOURCE_PRESERVED', 'UNRELATED_GRAPHQL_CONTAINERS_PRESERVED', 'UNRELATED_GRAPHQL_LISTENER_PRESERVED', 'LOCAL_GRAPHQL_STARTUP_UNVERIFIED', 'LOCAL_GRAPHQL_QUERY_UNVERIFIED', 'EXISTING_READER_ROLE_CONFLICT'];
  console.error(allowed.includes((error as Error).message) ? (error as Error).message : 'LOCAL_GRAPHQL_SETUP_FAILED', stage, '; no raw credentials logged.'); process.exitCode = 1;
}
