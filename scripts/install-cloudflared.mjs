import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile, chmod, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const directory = fileURLToPath(new URL('../.tools/cloudflared/', import.meta.url));
const version = '2026.10.0', digest = 'a2f79ff7b9420aa537d74af239f376da170bbabeb529aec416002adac6a72e70';
if (process.platform !== 'darwin' || process.arch !== 'arm64') throw new Error('This verified local installer targets Mac ARM64 only');
process.umask(0o077);
await mkdir(directory, { recursive: true, mode: 0o700 });
try { await access(directory + 'cloudflared'); if (execFileSync(directory + 'cloudflared', ['--version'], { encoding: 'utf8' }).includes(version)) { console.log('Pinned project cloudflared already installed; no tunnel started.'); process.exit(0); } } catch { /* install verified archive */ }
const response = await fetch(`https://github.com/cloudflare/cloudflared/releases/download/${version}/cloudflared-darwin-arm64.tgz`, { signal: AbortSignal.timeout(120_000) });
if (!response.ok) throw new Error('Official cloudflared download unavailable');
const bytes = new Uint8Array(await response.arrayBuffer());
if (createHash('sha256').update(bytes).digest('hex') !== digest) throw new Error('Official cloudflared checksum mismatch');
const archive = directory + 'cloudflared.tgz'; await writeFile(archive, bytes, { mode: 0o600 });
const entries = execFileSync('/usr/bin/tar', ['-tzf', archive], { encoding: 'utf8' }).trim().split('\n');
if (entries.some(entry => entry !== 'cloudflared' && entry !== './cloudflared')) throw new Error('Unexpected archive entries');
execFileSync('/usr/bin/tar', ['-xzf', archive, '-C', directory]); await chmod(directory + 'cloudflared', 0o700);
console.log(`Project cloudflared${version} installed with verified SHA256; no tunnel or publication started.`);
