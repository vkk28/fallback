import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { keccak256, toHex } from 'viem';

// Prepare source locally; this command neither submits source nor calls an explorer.
const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, '.tools/verification');
await mkdir(output, { recursive: true, mode: 0o700 });
const contracts = [];
for (const name of ['FallbackFactory', 'FallbackTestToken']) {
  const artifact = JSON.parse(await readFile(resolve(root, `contracts/out/${name}.sol/${name}.json`), 'utf8'));
  const metadata = artifact.metadata;
  if (metadata.compiler.version !== '0.8.30+commit.73712a01') throw new Error('Unexpected compiler metadata');
  const sources = {};
  for (const [path, entry] of Object.entries(metadata.sources)) {
    const full = resolve(root, 'contracts', path);
    if (!full.startsWith(root) || !path.endsWith('.sol')) throw new Error('Only project Solidity sources may be included');
    const content = await readFile(full, 'utf8');
    if (keccak256(toHex(content)) !== entry.keccak256) throw new Error('Source differs from compiled metadata');
    sources[path] = { content };
  }
  const { compilationTarget, ...settings } = metadata.settings;
  const input = { language: 'Solidity', sources, settings: { ...settings, outputSelection: { '*': { '*': ['evm.bytecode.object', 'evm.deployedBytecode.object'] } } } };
  const compiled = spawnSync(resolve(root, '.tools/solc'), ['--standard-json'], { input: JSON.stringify(input), encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  if (compiled.status !== 0) throw new Error('Local verification compilation failed');
  const result = JSON.parse(compiled.stdout);
  if (result.errors?.some(e => e.severity === 'error')) throw new Error('Standard JSON compilation failed');
  const source = Object.keys(compilationTarget)[0];
  const bytes = result.contracts[source][name].evm;
  if (`0x${bytes.bytecode.object}` !== artifact.bytecode.object || `0x${bytes.deployedBytecode.object}` !== artifact.deployedBytecode.object) throw new Error('Verification package does not reproduce compiled bytecode');
  await writeFile(resolve(output, `${name}.standard-json.json`), JSON.stringify(input, null, 2), { mode: 0o600 });
  contracts.push({ contract: name, compiler: metadata.compiler.version, sourceFiles: Object.keys(sources).length, exactBytecodeReproduction: true, published: false });
}
await writeFile(resolve(root, 'docs/evidence/source-verification-preparation.json'), JSON.stringify({ contracts, runtimeMatch: 'See monad-rpc.json', localPackage: '.tools/verification', observedAt: new Date().toISOString() }, null, 2));
console.log('Prepared local standard JSON packages; exact creation/runtime bytecode reproduced. No source was uploaded.');
