import { createRequire } from 'node:module';

/** Resolve the native binary directly: upstream 1.7.1 JS wrapper loses child exit codes. */
export function foundryBinary(tool) {
  const require = createRequire(import.meta.url);
  const packageRequire = createRequire(require.resolve(`@foundry-rs/${tool}/package.json`));
  const arch = process.arch === 'x64' ? 'amd64' : process.arch;
  const extension = process.platform === 'win32' ? '.exe' : '';
  return packageRequire.resolve(`@foundry-rs/${tool}-${process.platform}-${arch}/bin/${tool}${extension}`);
}
