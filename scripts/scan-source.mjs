import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

// Check the exact index before a commit; ordinary runs also inspect new source.
const staged = process.argv.includes('--staged');
const paths = [...new Set(execFileSync('git', ['ls-files', '-z', ...(staged ? ['--cached'] : ['--cached', '--others', '--exclude-standard'])], { encoding: 'utf8' }).split('\0').filter(Boolean))];
if (!paths.length) throw new Error('NO_SOURCE_FILES');
const env = existsSync('.env') ? readFileSync('.env', 'utf8') : '';
const secrets = env.split('\n').flatMap(line => {
  const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (!match || match[1].startsWith('NEXT_PUBLIC_') || !/SECRET|PRIVATE_KEY|PASSWORD|TOKEN_KEY|DATABASE_URL/.test(match[1])) return [];
  const value = match[2].trim().replace(/^['"]|['"]$/g, '');
  return value.length >= 16 ? [value] : [];
});
const forbidden = /^(?:\.env(?:$|\.)|\.aws\/|\.private\/|\.tools\/|\.cache\/|\.graphify\/|graphify-out\/|infra\/data\/|contracts\/(?:out|cache|broadcast)\/|indexer\/(?:generated|\.envio)\/)|(?:^|\/)\.next\/|\.(?:pem|key|keystore|dump|backup|sqlite(?:3)?)(?:$|-)/;
const findings = [];
for (const path of paths) {
  if ((path !== '.env.example' && forbidden.test(path)) || (path.startsWith('docs/evidence/') && path !== 'docs/evidence/source-stabilization.json')) {
    findings.push({ path, kind: 'private-or-generated-artifact' });
    continue;
  }
  if (!staged && !existsSync(path)) continue;
  const bytes = staged ? execFileSync('git', ['show', `:${path}`], { maxBuffer: 16 * 1024 * 1024 }) : readFileSync(path);
  if (bytes.includes(0)) continue;
  const source = bytes.toString('utf8');
  if (secrets.some(value => source.includes(value))) findings.push({ path, kind: 'configured-secret' });
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bAKIA[A-Z0-9]{16}\b|\bgh[pousr]_[A-Za-z0-9]{36,}\b/.test(source)) findings.push({ path, kind: 'credential-material' });
  if (/\/Users\/[^/\s]+\//.test(source)) findings.push({ path, kind: 'personal-machine-path' });
}
console.log(JSON.stringify({ scope: staged ? 'git-index' : 'source-files', filesChecked: paths.length, configuredSecretsChecked: secrets.length, findings, passed: findings.length === 0 }));
if (findings.length) process.exitCode = 1;
