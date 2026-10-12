import { expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { sealBackup, openBackup } from './backups.js';
it('round-trips exact bytes with fresh nonces while authenticating the key, header and ciphertext', () => {
  const key = randomBytes(32), bytes = Buffer.from('{"fixture":"private account metadata","amount":"340282366920938463463374607431768211455"}');
  const first = sealBackup(bytes, key), second = sealBackup(bytes, key);
  expect(first.equals(second)).toBe(false); expect(first.includes(bytes)).toBe(false);
  expect(openBackup(first, key).equals(bytes)).toBe(true);
  expect(() => openBackup(first, randomBytes(32))).toThrow('BACKUP_AUTHENTICATION_FAILED');
  for (const position of [8, 21, first.length - 1]) { const damaged = Buffer.from(first); damaged[position] = damaged[position]! ^ 1; expect(() => openBackup(damaged, key)).toThrow('BACKUP_AUTHENTICATION_FAILED'); }
  const header = Buffer.from(first); header[0] = 0; expect(() => openBackup(header, key)).toThrow('BACKUP_KEY_OR_SIZE_INVALID');
});
it('rejects truncated envelopes and wrong-size keys', () => {
  expect(() => openBackup(Buffer.alloc(35), randomBytes(32))).toThrow('BACKUP_KEY_OR_SIZE_INVALID');
  expect(() => sealBackup(Buffer.from('fixture'), Buffer.alloc(16))).toThrow('BACKUP_KEY_OR_SIZE_INVALID');
});
