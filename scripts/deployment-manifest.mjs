import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createPublicClient, getAddress, http } from 'viem';
import { monadTestnet } from 'viem/chains';
const path = new URL('../contracts/broadcast/Deploy.s.sol/10143/run-latest.json', import.meta.url);
const data = JSON.parse(await readFile(path, 'utf8'));
const token = data.transactions?.find(t => t.contractName === 'FallbackTestToken')?.contractAddress;
const factory = data.transactions?.find(t => t.contractName === 'FallbackFactory')?.contractAddress;
if (!token || !factory) throw new Error('Both deployed contracts must be present in actual broadcast artifacts');
const client = createPublicClient({ chain: monadTestnet, transport: http(process.env.MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz') });
if (await client.getChainId() !== 10143) throw new Error('Monad testnet only');
const receipts = [];
for (const transaction of data.transactions.filter(t => t.contractName === 'FallbackTestToken' || t.contractName === 'FallbackFactory')) {
  const receipt = await client.getTransactionReceipt({ hash: transaction.hash });
  if (receipt.status !== 'success') throw new Error('Deployment was not successful');
  receipts.push({ hash: transaction.hash, address: getAddress(receipt.contractAddress), block: receipt.blockNumber.toString() });
}
await mkdir(new URL('../packages/chain/deployments/', import.meta.url), { recursive: true });
await writeFile(new URL('../packages/chain/deployments/monad-testnet.json', import.meta.url), JSON.stringify({ chainId: 10143, token: getAddress(token), factory: getAddress(factory), asset: { symbol: 'FBTEST', decimals: 6, testOnly: true, realValue: false }, receipts, sourceVerification: 'pending-explorer-verification', observedAt: new Date().toISOString() }, null, 2));
console.log('Recorded successful deployment receipts; run chain:verify and explorer source verification next.');
