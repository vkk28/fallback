import { createHash } from 'node:crypto';
import { mkdir, writeFile, chmod } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// The official 0.8.30 macOS release is x86_64; Apple Silicon needs Rosetta.
const platform = process.platform === 'darwin' ? 'macosx-amd64'
  : process.platform === 'linux' && process.arch === 'x64' ? 'linux-amd64' : undefined;
if (!platform) throw new Error('Install official Solidity 0.8.30 manually; platform not supported by this helper');
const base = `https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/${platform}`;
const indexResponse = await fetch(`${base}/list.json`, { signal: AbortSignal.timeout(30_000) });
if (!indexResponse.ok) throw new Error(`Compiler metadata HTTP ${indexResponse.status}`);
const index = await indexResponse.json();
const release = index.builds.find(b => b.path === index.releases['0.8.30']);
if (!release?.sha256) throw new Error('Verified Solidity 0.8.30 release unavailable');
const response = await fetch(`${base}/${release.path}`, { signal: AbortSignal.timeout(60_000) });
if (!response.ok) throw new Error(`Compiler download HTTP ${response.status}`);
const binary = Buffer.from(await response.arrayBuffer());
const hash = createHash('sha256').update(binary).digest('hex');
if (`0x${hash}` !== release.sha256) throw new Error('Compiler checksum mismatch');
const directory = fileURLToPath(new URL('../.tools/', import.meta.url));
await mkdir(directory, { recursive: true });
await writeFile(`${directory}/solc`, binary);
await chmod(`${directory}/solc`, 0o755);
await writeFile(`${directory}/solc-checksum.json`, JSON.stringify({ platform, ...release }, null, 2));
console.log(`Installed ${release.longVersion}, sha256 ${hash}`);
