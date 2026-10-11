import { defineConfig } from 'drizzle-kit';
export default defineConfig({ dialect: 'postgresql', schema: './packages/backend/src/schema.ts', out: './infra/migrations' });
