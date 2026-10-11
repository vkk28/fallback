import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { getAddress } from 'viem';

const fixture = process.argv.includes('--local-fixture');
const rpcMode = process.argv.includes('--rpc');
const local = fixture ? JSON.parse(await readFile(new URL('../docs/evidence/local-integration.json', import.meta.url), 'utf8')) : null;
const chainId = fixture ? 31337 : Number(process.env.CHAIN_ID || 10143), factory = fixture ? local.factory : process.env.FACTORY_ADDRESS;
if (![10143, 31337].includes(chainId) || !factory) throw new Error('Configure actual verified CHAIN_ID and FACTORY_ADDRESS');
const block = fixture ? 0 : Number(process.env.DEPLOYMENT_START_BLOCK || 0);
if (!Number.isSafeInteger(block) || block < 0) throw new Error('Invalid start block');
const contracts = [];
await mkdir(new URL('../indexer/abis/', import.meta.url), { recursive: true });
for (const name of ['FallbackFactory', 'FallbackPlan']) {
  const artifact = JSON.parse(await readFile(new URL(`../contracts/out/${name}.sol/${name}.json`, import.meta.url), 'utf8'));
  await writeFile(new URL(`../indexer/abis/${name}.json`, import.meta.url), JSON.stringify(artifact.abi, null, 2));
  contracts.push({ name, abi_file_path: `abis/${name}.json`, events: artifact.abi.filter(a => a.type === 'event').map(a => ({ event: a.name })), ...(name === 'FallbackFactory' ? { address: getAddress(factory) } : {}) });
}
// The configured public testnet RPC accepts 100-block log ranges but rejects
// 1,000/10,000 with HTTP 413 (-32614). Envio defaults to 10,000 and accelerates
// after successes, repeatedly hitting that limit. Recover from transient backoff
// in small steps while never exceeding the proved 100-block ceiling. With zero
// acceleration a single transient error permanently shrinks every later query.
// Preserve the original start block, committed DB, and reorg settings.
const rpcBounds = chainId === 10143 ? { initial_block_interval: 100, interval_ceiling: 100, acceleration_additive: 10 } : {};
const config = { name: 'fallback', handlers: 'src/handlers', rollback_on_reorg: true, save_full_history: true, field_selection: { transaction_fields: ['hash'] }, chains: [{ id: chainId, start_block: block, max_reorg_depth: chainId === 31337 ? 0 : 100, block_lag: chainId === 31337 ? 0 : 2, ...(chainId === 31337 || rpcMode ? { rpc: { url: fixture ? 'http://127.0.0.1:8545' : '${MONAD_RPC_URL}', for: 'sync', ...rpcBounds } } : {}), contracts }] };
await writeFile(new URL(fixture ? '../indexer/config.fixture.yaml' : '../indexer/config.yaml', import.meta.url), JSON.stringify(config, null, 2));
console.log('Generated Envio configuration and ABIs; no chain/indexer execution performed.');
