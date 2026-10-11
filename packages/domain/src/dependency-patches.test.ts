import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
const require = createRequire(import.meta.url);
const nextLint = createRequire(require.resolve('eslint-config-next/core-web-vitals'));
const plugin = createRequire(nextLint.resolve('@next/eslint-plugin-next'));
const glob = createRequire(plugin.resolve('fast-glob'));
const matcher = createRequire(glob.resolve('micromatch'));
const braces = matcher('braces');
const query = createRequire(process.cwd() + '/node_modules/.pnpm/query-string@7.1.3/node_modules/query-string/package.json');
const decode = query('decode-uri-component');

describe('installed dependency security guards', () => {
  it('retains ordinary brace expansion but rejects deep input and direct ASTs before stack exhaustion', () => {
    expect(braces.expand('a/{b,c}/d')).toEqual(['a/b/d', 'a/c/d']);
    expect(braces.compile('a/{b,c}/d')).toBe('a/(b|c)/d');
    expect(() => braces.parse('{'.repeat(4000) + 'x' + '}'.repeat(4000))).toThrow(/nesting depth/);
    let ast = { type: 'root', nodes: [] as unknown[] };
    for (let i = 0; i < 1000; i++) ast = { type: 'root', nodes: [ast] };
    for (const operation of [braces.compile, braces.expand, braces.stringify]) expect(() => operation(ast)).toThrow(/nesting depth/);
  });
  it('retains valid, space, UTF-8 and BOM decoding and bounds malformed work', () => {
    expect(decode('hello+world')).toBe('hello world');
    expect(decode('%E2%98%83')).toBe('☃');
    expect(decode('%FE%FF')).toBe('��');
    const start = performance.now();
    const malicious = '%E0%A4'.repeat(4000);
    expect(typeof decode(malicious)).toBe('string');
    expect(performance.now() - start).toBeLessThan(1000);
    expect(typeof decode('%E0%A4'.repeat(1000))).toBe('string');
  });
});
