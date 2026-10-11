import { createPublicClient, defineChain, erc20Abi, getAddress, http } from 'viem';
import { readFile } from 'node:fs/promises';

async function verifyRuntime(client, address, name) {
  const code = await client.getCode({ address });
  if (!code || code === '0x') throw new Error(`${name} has no deployed code`);
  const artifact = JSON.parse(await readFile(new URL(`../contracts/out/${name}.sol/${name}.json`, import.meta.url), 'utf8'));
  let observed = code.slice(2);
  let expected = artifact.deployedBytecode.object.slice(2);
  // Constructor-embedded immutables are checked separately through their reads.
  for (const spans of Object.values(artifact.deployedBytecode.immutableReferences || {})) {
    for (const { start, length } of spans) {
      const end = (start + length) * 2;
      observed = observed.slice(0, start * 2) + '0'.repeat(length * 2) + observed.slice(end);
      expected = expected.slice(0, start * 2) + '0'.repeat(length * 2) + expected.slice(end);
    }
  }
  if (observed.toLowerCase() !== expected.toLowerCase()) throw new Error(`${name} bytecode differs from the compiled selected contract`);
}

try {
const url = process.env.MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz';
const expected = Number(process.env.CHAIN_ID || 10143);
if (![10143, 31337].includes(expected)) throw new Error('Only Monad testnet and local development are configured');
const client = createPublicClient({ chain: defineChain({ id: expected, name: 'Fallback test network', nativeCurrency: { name: 'Test MON', symbol: 'MON', decimals: 18 }, rpcUrls: { default: { http: [url] } } }), transport: http(url, { timeout: 15_000, retryCount: 1 }) });
const chainId = await client.getChainId();
if (chainId !== expected) throw new Error(`Network mismatch: expected ${expected}, got ${chainId}`);
const block = await client.getBlock();
const report = { chainId, blockNumber: block.number.toString(), blockTimestamp: block.timestamp.toString(), observedAt: new Date().toISOString(), assetVerified: false, deploymentVerified: false };
if (process.env.TOKEN_ADDRESS) {
  const token = getAddress(process.env.TOKEN_ADDRESS);
  await verifyRuntime(client, token, 'FallbackTestToken');
  const decimals = await client.readContract({ address: token, abi: erc20Abi, functionName: 'decimals' });
  const symbol = await client.readContract({ address: token, abi: erc20Abi, functionName: 'symbol' });
  if (decimals !== 6 || symbol !== 'FBTEST') throw new Error('Configured token is not the selected six-decimal test asset');
  report.assetVerified = true;
  if (process.env.FACTORY_ADDRESS) {
    const factory = getAddress(process.env.FACTORY_ADDRESS);
    await verifyRuntime(client, factory, 'FallbackFactory');
    const asset = await client.readContract({ address: factory, abi: [{ type: 'function', name: 'token', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] }], functionName: 'token' });
    if (getAddress(asset) !== token) throw new Error('Factory asset mismatch');
    const factoryChain = await client.readContract({ address: factory, abi: [{ type: 'function', name: 'chainId', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }], functionName: 'chainId' });
    if (factoryChain !== BigInt(expected)) throw new Error('Factory deployment chain mismatch');
    report.deploymentVerified = true;
  }
}
console.log(JSON.stringify(report, null, 2));
} catch (error) {
  // Provider error stacks can include private RPC URLs. Output no raw upstream error.
  const name = error?.name;
  const safe = error?.constructor === Error && !/https?:\/\/|0x[a-f\d]{40}/i.test(error.message);
  console.error(safe ? error.message : `Network/deployment verification failed (${name || 'unknown error'}). Check private configuration and RPC availability.`);
  process.exitCode = 1;
}
