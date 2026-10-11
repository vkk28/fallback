import { spawnSync } from 'node:child_process';
import { foundryBinary } from './foundry-binary.mjs';
const result = spawnSync(foundryBinary('cast'), process.argv.slice(2), { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
