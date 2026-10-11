import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema.js';

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;
let db: Database | undefined;
let client: ReturnType<typeof postgres> | undefined;
export function database(): Database {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_UNAVAILABLE');
  if (!db) {
    client = postgres(url, { max: 5, idle_timeout: 20, connect_timeout: 10 });
    db = drizzle(client, { schema });
  }
  return db;
}

/** A completed hosted worker must release its sessions before Lambda freezes. */
export async function closeDatabase() {
  const closing = client;
  db = undefined; client = undefined;
  if (closing) await closing.end({ timeout: 5 });
}
