import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
const url = process.env.DATABASE_URL;
if (!url) throw new Error('Configure DATABASE_URL in ignored .env before migrating');
const client = postgres(url, { max: 1 });
try { await migrate(drizzle(client), { migrationsFolder: 'infra/migrations' }); console.log('Database migrations applied.'); }
catch { console.error('Migration failed; check private database configuration.'); process.exitCode = 1; }
finally { await client.end(); }
