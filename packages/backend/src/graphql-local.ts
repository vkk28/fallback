import type postgres from 'postgres';

export const indexerTables = ['Plan', 'Terms', 'Timeline', 'Supporter', 'Installment', 'chain_metadata'] as const;
export const graphqlReaderRole = 'fallback_graphql_reader';
export function localIndexerUrl(value: string) {
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname !== '127.0.0.1' || url.port !== '54329' || url.search || url.hash || !url.username || !url.password) throw new Error('DEDICATED_LOCAL_DATABASE_REQUIRED');
  url.pathname = '/fallback_indexer';
  return url;
}
export function readerConnection(adminUrl: string, password: string, container = false) {
  if (!/^[a-f0-9]{64}$/.test(password)) throw new Error('INVALID_LOCAL_READER_SECRET');
  const url = localIndexerUrl(adminUrl);
  url.username = graphqlReaderRole; url.password = password;
  if (container) url.hostname = 'host.docker.internal';
  return url.toString();
}

/** Scope a dedicated query account to known Envio tables. Never reset the indexer. */
export async function prepareIndexerReader(db: postgres.Sql, password: string, existingCredential: boolean) {
  if (!/^[a-f0-9]{64}$/.test(password)) throw new Error('INVALID_LOCAL_READER_SECRET');
  await db.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(179146, 8080)`;
    const roles = await tx`SELECT rolname, rolsuper, rolcreaterole, rolcreatedb, rolreplication, rolbypassrls FROM pg_roles WHERE rolname=${graphqlReaderRole}`;
    if (roles.length) {
      if (!existingCredential || roles.some(r => r.rolsuper || r.rolcreaterole || r.rolcreatedb || r.rolreplication || r.rolbypassrls)) throw new Error('EXISTING_READER_ROLE_CONFLICT');
      const memberships = await tx`SELECT 1 FROM pg_auth_members WHERE member=(SELECT oid FROM pg_roles WHERE rolname=${graphqlReaderRole})`;
      if (memberships.length) throw new Error('EXISTING_READER_ROLE_CONFLICT');
    } else {
      // Hex-only generated value; DDL cannot bind PostgreSQL password parameters.
      await tx.unsafe(`CREATE ROLE ${graphqlReaderRole} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);
    }
    await tx.unsafe(`GRANT CONNECT ON DATABASE fallback_indexer TO ${graphqlReaderRole}`);
    // Envio's schema can grant CREATE to PUBLIC. Preserve owner writes, remove inherited reader DDL.
    await tx.unsafe('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
    await tx.unsafe(`GRANT USAGE ON SCHEMA public TO ${graphqlReaderRole}`);
    for (const table of indexerTables) await tx.unsafe(`GRANT SELECT ON TABLE public."${table}" TO ${graphqlReaderRole}`);
    await tx.unsafe(`ALTER ROLE ${graphqlReaderRole} SET default_transaction_read_only = on`);
    await tx.unsafe(`ALTER ROLE ${graphqlReaderRole} SET statement_timeout = '10s'`);
  });
}

export function hasuraSource() {
  return { name: 'fallback_indexer', kind: 'postgres', tables: indexerTables.map(name => ({
    table: { schema: 'public', name }, configuration: name === 'chain_metadata' ? {
      custom_name: 'FallbackSync', column_config: {
        chain_id: { custom_name: 'chainId' }, latest_processed_block: { custom_name: 'processedBlock' },
        block_height: { custom_name: 'sourceBlock' }, num_events_processed: { custom_name: 'eventsProcessed' },
      },
    } : { custom_name: name },
  })), configuration: { connection_info: { database_url: { from_env: 'FALLBACK_INDEXER_READ_URL' }, pool_settings: { max_connections: 3, idle_timeout: 30, connection_lifetime: 600 } } } };
}
