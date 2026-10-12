import assert from 'node:assert/strict';
import { appendFile, chmod, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { sealBackup, openBackup } from '../packages/backend/src/backups.js';
process.umask(0o077);
try {
  assert.equal(process.env.CHAIN_ID, '10143');
  let key = process.env.BACKUP_ENCRYPTION_KEY;
  if (!key) {
    key = randomBytes(32).toString('hex');
    await appendFile('.env', `\n# Private backup encryption key; retain separately for recovery.\nBACKUP_ENCRYPTION_KEY=${key}\n`, { mode: 0o600 });
    await chmod('.env', 0o600);
  }
  assert.match(key, /^[a-f0-9]{64}$/);
  const folders = (await readdir('.tools/backups')).filter(n => /^\d{4}-\d{2}-\d{2}T/.test(n)).sort().reverse();
  assert.ok(folders.length, 'APPLICATION_BACKUP_REQUIRED');
  const source = [join('.tools/backups', folders[0]!, 'application.json'), '.tools/hosting/indexer-snapshot.json'];
  const artifacts = [];
  for (const [i, path] of source.entries()) {
    const bytes = await readFile(path); assert.ok(bytes.length <= 30 * 1024 * 1024);
    const data = JSON.parse(bytes.toString()) as { capturedAt: string; tables: {table: string; rows: unknown[]}[] };
    assert.ok(Number.isFinite(Date.parse(data.capturedAt))); assert.ok(Array.isArray(data.tables) && data.tables.length <= 50);
    artifacts.push({ kind: i === 0 ? 'application' : 'indexer', capturedAt: data.capturedAt, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.toString('base64'), tables: data.tables.length });
  }
  const payload = Buffer.from(JSON.stringify({ version: 1, artifacts }));
  const sealed = sealBackup(payload, Buffer.from(key, 'hex'));
  const folder = join('.tools/backups', 'sealed-' + new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomBytes(4).toString('hex'));
  await mkdir(folder, { recursive: true, mode: 0o700 });
  await writeFile(join(folder, 'backup.enc'), sealed, { mode: 0o600, flag: 'wx' });
  const recovered = openBackup(await readFile(join(folder, 'backup.enc')), Buffer.from(key, 'hex'));
  assert.ok(recovered.equals(payload));
  const roundtrip = JSON.parse(recovered.toString()) as { artifacts: typeof artifacts };
  for (const artifact of roundtrip.artifacts) {
    const bytes = Buffer.from(artifact.bytes, 'base64');
    assert.equal(createHash('sha256').update(bytes).digest('hex'), artifact.sha256);
    await writeFile(join(folder, artifact.kind + '-restored.json'), bytes, { mode: 0o600, flag: 'wx' });
  }
  const report = { observedAt: new Date().toISOString(), scope: 'Current local application backup plus retained historical indexer snapshot', encryption: 'AES-256-GCM authenticated envelope with fresh nonce', byteExactRecoveryVerified: true, artifacts: artifacts.map(({ kind, capturedAt, tables }) => ({ kind, capturedAt, tables })), keyLocation: 'Ignored private .env; keep an independent protected recovery copy', privateFolder: folder, remoteUploadPerformed: false, scheduledRemoteBackupEnabled: false };
  await writeFile('docs/evidence/sealed-backup-verification.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} catch { console.error('BACKUP_SEAL_VERIFICATION_FAILED; no key, rows or raw file contents logged'); process.exitCode = 1; }
