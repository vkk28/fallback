import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
export default defineConfig([
  ...nextVitals, ...nextTypescript,
  globalIgnores(['node_modules/**', '.tools/**', '.codex/**', 'graphify-out/**', '**/.next/**', 'packages/chain/src/Fallback*.ts', 'indexer/.envio/**', 'workflows/cre/main.js', 'contracts/**']),
  { files: ['**/*.{ts,tsx,mjs}'], settings: { next: { rootDir: 'apps/web/' } }, rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }] } },
]);
