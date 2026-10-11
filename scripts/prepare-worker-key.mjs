import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url)), path = root + '.env';
if (!existsSync(path)) throw new Error('Prepare the project .env first');
process.loadEnvFile(path);
if (process.env.CHAIN_ID !== '10143') throw new Error('Monad testnet only');
let key = process.env.WORKER_PRIVATE_KEY;
if (!key) {
  key = generatePrivateKey();
  let source = readFileSync(path, 'utf8');
  const line = `WORKER_PRIVATE_KEY=${key}`;
  source = /^WORKER_PRIVATE_KEY=.*$/m.test(source) ? source.replace(/^WORKER_PRIVATE_KEY=.*$/m, line) : `${source.trimEnd()}\n${line}\n`;
  writeFileSync(path, source, { mode: 0o600 }); chmodSync(path, 0o600);
}
const address = privateKeyToAccount(key).address;
mkdirSync(root + '.tools', { recursive: true, mode: 0o700 });
writeFileSync(root + '.tools/worker-testnet-address.txt', address + '\n', { mode: 0o600 });
console.log('Dedicated worker signer prepared locally. Private key stays in ignored .env; its public faucet address is in ignored .tools/worker-testnet-address.txt. No transaction sent.');
