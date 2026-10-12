import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
const magic = Buffer.from('FBACKUP1');
const limit = 64 * 1024 * 1024;
export function sealBackup(bytes: Buffer, key: Buffer) {
  if (key.length !== 32 || bytes.length > limit) throw new Error('BACKUP_KEY_OR_SIZE_INVALID');
  const nonce = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(magic);
  const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([magic, nonce, encrypted, cipher.getAuthTag()]);
}
export function openBackup(sealed: Buffer, key: Buffer) {
  if (key.length !== 32 || sealed.length < 36 || sealed.length > limit + 36 || !sealed.subarray(0, 8).equals(magic)) throw new Error('BACKUP_KEY_OR_SIZE_INVALID');
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, sealed.subarray(8, 20));
    decipher.setAAD(magic); decipher.setAuthTag(sealed.subarray(-16));
    return Buffer.concat([decipher.update(sealed.subarray(20, -16)), decipher.final()]);
  } catch { throw new Error('BACKUP_AUTHENTICATION_FAILED'); }
}
