import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { foundryBinary } from './foundry-binary.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
let status = 0;
for (const name of ['FallbackFactory', 'FallbackTestToken']) {
  rmSync(`${root}docs/evidence/slither-${name}.json`, { force: true });
  const result = spawnSync(`${root}.tools/security/bin/slither`, [`src/${name}.sol`, '--compile-force-framework', 'solc', '--solc', `${root}.tools/solc`, '--solc-remaps', '@openzeppelin/contracts/=../node_modules/@openzeppelin/contracts/', '--solc-args', '--allow-paths ..', '--filter-paths', 'node_modules', '--json', `${root}docs/evidence/slither-${name}.json`, '--fail-high'], {
    cwd: root + 'contracts', stdio: 'inherit',
    env: { ...process.env, VIRTUAL_ENV: root + '.tools/security', PATH: dirname(foundryBinary('forge')) + ':' + process.env.PATH },
  });
  if (result.error) throw result.error;
  status ||= result.status ?? 1;
}
process.exit(status);
