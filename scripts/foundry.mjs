import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { foundryBinary } from './foundry-binary.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
// Forge runs in contracts; credential paths are relative to the caller's cwd.
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  for (const flag of ['--keystore', '--password-file']) {
    if (args[i] === flag && args[i + 1]) args[i + 1] = resolve(args[i + 1]);
    else if (args[i].startsWith(`${flag}=`)) args[i] = `${flag}=${resolve(args[i].slice(flag.length + 1))}`;
  }
}
const result = spawnSync(foundryBinary('forge'), args, {
  cwd: root + 'contracts', stdio: 'inherit',
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
