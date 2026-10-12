import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve, join } from 'node:path';
import { createPublicClient, encodeAbiParameters, getAddress, http, keccak256, toBytes } from 'viem';
import { monadTestnet } from 'viem/chains';
try {
  assert.equal(Number(process.env.CHAIN_ID), 10143);
  const names = ['FallbackTestToken', 'FallbackFactory', 'FallbackPlan'];
  const artifacts = {}, sources = {};
  for (const name of names) {
    const artifact = JSON.parse(await readFile(`contracts/out/${name}.sol/${name}.json`, 'utf8')); artifacts[name] = artifact;
    assert.equal(artifact.metadata.compiler.version, '0.8.30+commit.73712a01');
    for (const [path, expected] of Object.entries(artifact.metadata.sources)) {
      assert.ok(path.startsWith('src/') || path.startsWith('../node_modules/@openzeppelin/contracts/'));
      const content = await readFile(resolve('contracts', path), 'utf8');
      assert.equal(keccak256(toBytes(content)), expected.keccak256); sources[path] = { content };
    }
  }
  const { compilationTarget: _target, ...settings } = artifacts.FallbackFactory.metadata.settings;
  settings.outputSelection = { '*': { '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'metadata'] } };
  const input = { language: 'Solidity', sources, settings };
  const child = spawn(resolve('.tools/solc'), ['--standard-json'], { stdio: ['pipe', 'pipe', 'pipe'] });
  let output = ''; child.stdout.on('data', bytes => { output += bytes.toString(); }); child.stderr.resume(); child.stdin.end(JSON.stringify(input));
  assert.equal(await new Promise(resolve => { child.once('error', () => resolve(1)); child.once('exit', resolve); }), 0);
  const compiled = JSON.parse(output.slice(output.indexOf('{')));
  assert.ok(!compiled.errors?.some(error => error.severity === 'error'));
  for (const name of names) assert.equal(compiled.contracts[`src/${name}.sol`][name].evm.deployedBytecode.object.toLowerCase(), artifacts[name].deployedBytecode.object.replace(/^0x/, '').toLowerCase());
  const directory = '.tools/explorer-verification'; await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(join(directory, 'standard-json-input.json'), JSON.stringify(input, null, 2) + '\n', { mode: 0o600 });
  const constructorArgs = { FallbackTestToken: '0x', FallbackFactory: encodeAbiParameters([{ type: 'address' }], [getAddress(process.env.TOKEN_ADDRESS)]) };
  const client = createPublicClient({ chain: monadTestnet, transport: http(process.env.MONAD_RPC_URL, { timeout: 15_000, retryCount: 1, fetchOptions: { redirect: 'error' } }) });
  assert.equal(await client.getChainId(), 10143);
  const factory = getAddress(process.env.FACTORY_ADDRESS), token = getAddress(process.env.TOKEN_ADDRESS), blockNumber = await client.getBlockNumber();
  const count = await client.readContract({ address: factory, abi: artifacts.FallbackFactory.abi, functionName: 'planCount', blockNumber });
  assert.ok(count <= 50n);
  constructorArgs.plans = {};
  for (let i = 0n; i < count; i++) {
    const address = await client.readContract({ address: factory, abi: artifacts.FallbackFactory.abi, functionName: 'planAt', args: [i], blockNumber });
    const target = { address, abi: artifacts.FallbackPlan.abi };
    const [asset, recipient, payee, hash, terms] = await client.multicall({ blockNumber, allowFailure: false, contracts: ['token', 'recipient', 'payee', 'termsHash', 'terms'].map(functionName => ({ ...target, functionName })) });
    assert.equal(getAddress(asset), token);
    constructorArgs.plans[address] = encodeAbiParameters(artifacts.FallbackPlan.abi.find(entry => entry.type === 'constructor').inputs, [asset, recipient, payee, hash, terms]);
  }
  await writeFile(join(directory, 'constructor-arguments.json'), JSON.stringify(constructorArgs, null, 2) + '\n', { mode: 0o600 });
  const report = { observedAt: new Date().toISOString(), compiler: '0.8.30+commit.73712a01', optimizerRuns: 200, evmVersion: 'cancun', sourceHashesVerified: true, compiledRuntimeMatches: names, standardInputPrepared: true, constructorArgumentsPrepared: ['FallbackTestToken', 'FallbackFactory'], planConstructorArgumentsPrepared: Number(count), immutableReadsBlock: blockNumber.toString(), explorerUploadPerformed: false };
  await writeFile('docs/evidence/explorer-input-verification.json', JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report));
} catch { console.error('EXPLORER_INPUT_PREPARATION_FAILED; no private data or compiler output logged'); process.exitCode = 1; }
