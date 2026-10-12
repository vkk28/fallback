import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
async function files(path) {
  const result = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const name = join(path, entry.name);
    if (entry.isDirectory()) result.push(...await files(name));
    else if (/\.(js|css|json|map)$/.test(entry.name)) result.push(name);
  }
  return result;
}
const raw = existsSync('.env') ? await readFile('.env', 'utf8') : '';
const privateValues = raw.split('\n').map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')]; }).filter(([k, v]) => k && /SECRET|PRIVATE_KEY|PASSWORD|TOKEN_KEY|DELIVERY_KEY|ENCRYPTION_KEY|API_KEY|DATABASE_URL|RPC_URL/.test(k) && !k.startsWith('NEXT_PUBLIC_') && v && v.length > 16).flatMap(([k, v]) => {
  if (!k.endsWith('RPC_URL')) return [[k, v]];
  if (v === 'https://testnet-rpc.monad.xyz' || /^http:\/\/(localhost|127\.0\.0\.1)/.test(v)) return [];
  const key = new URL(v).pathname.split('/').at(-1);
  return [[k, v], ...(key && key.length >= 16 ? [[k, key]] : [])];
});
const artifacts = await files('apps/web/.next/static');
const leaked = new Set();
for (const path of artifacts) { const text = await readFile(path, 'utf8'); for (const [key, value] of privateValues) if (text.includes(value)) leaked.add(key); }
const report = { artifactsChecked: artifacts.length, privateConfigurationFieldsChecked: privateValues.map(([k]) => k), leakedFieldNames: [...leaked], passed: leaked.size === 0, observedAt: new Date().toISOString() };
await writeFile('docs/evidence/client-secret-scan.json', JSON.stringify(report, null, 2));
console.log(`Client artifact secret scan ${report.passed ? 'passed' : 'FAILED'}; no secret values emitted.`);
if (!report.passed) process.exitCode = 1;
