import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
if (existsSync(root + '.env')) process.loadEnvFile(root + '.env');
// Next propagates execArgv to build workers; --env-file must not be in execArgv.
const child = spawn(process.execPath, [root + 'node_modules/next/dist/bin/next', process.argv[2], root + 'apps/web', ...process.argv.slice(3)], { cwd: root, stdio: 'inherit', env: process.env });
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
child.on('error', () => { console.error('Next.js process could not start.'); process.exitCode = 1; });
child.on('exit', code => process.exit(code ?? 1));
