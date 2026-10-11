import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests/browser', workers: 1, use: { baseURL: 'http://localhost:3000', headless: true }, reporter: [['list'], ['json', { outputFile: 'docs/evidence/browser-tests.json' }]] });
