import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema.js';

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;
let db: Database | undefined;
export function database(): Database {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_UNAVAILABLE');
  db ??= drizzle(postgres(url, { max: 5, idle_timeout: 20, connect_timeout: 10 }), { schema });
  return db;
}
