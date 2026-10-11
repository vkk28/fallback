import { spawn } from 'node:child_process';
import { foundryBinary } from './foundry-binary.mjs';

const child = spawn(foundryBinary('anvil'), ['--host', '127.0.0.1', '--chain-id', '31337', ...process.argv.slice(2)], { stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { throw error; });
child.on('exit', code => process.exit(code ?? 1));
