import { discoveryPageSize } from '../../domain/src/scheduling.js';

export function creSimulationArguments(args: string[]) {
  const requireWork = args.includes('--require-work');
  const positional = args.filter(value => value !== '--require-work');
  if (args.filter(value => value === '--require-work').length > 1 || positional.length !== 2 || positional[0] !== '--authorized-origin' || !positional[1]) throw new Error('EXPLICIT_AUTHORIZED_ORIGIN_REQUIRED');
  return { authorization: positional[1], requireWork };
}

/** CLI success alone, contradictory logs and an empty scan cannot prove useful work. */
export function creSimulationOutcome(diagnostic: string, cliExitCode: number, requireWork = false) {
  const observations = [...diagnostic.matchAll(/Scanned (\d+) plans; accepted (\d+) job requests, skipped (\d+) stale candidates\./g)]
    .map(match => ({ scanned: Number(match[1]), accepted: Number(match[2]), stale: Number(match[3]) }));
  const first = observations[0];
  const result = first && observations.every(value =>
    [value.scanned, value.accepted, value.stale].every(count => Number.isSafeInteger(count) && count >= 0 && count <= discoveryPageSize)
    && value.accepted + value.stale <= value.scanned && JSON.stringify(value) === JSON.stringify(first)) ? first : null;
  const workflowResultVerified = cliExitCode === 0 && result !== null;
  const usefulWorkVerified = workflowResultVerified && result.accepted > 0;
  const exitCode = cliExitCode !== 0 ? cliExitCode : !workflowResultVerified ? 1 : requireWork && !usefulWorkVerified ? 2 : 0;
  return { result, workflowResultVerified, usefulWorkVerified, exitCode };
}

export function approvedCreOrigin(configured: string, authorized: string) {
  const check = (value: string) => {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || /(?:^|\.)(example|invalid|localhost)$/.test(url.hostname) || url.hostname === '127.0.0.1') throw new Error('TRUSTED_HTTPS_ADAPTER_REQUIRED');
    return url.origin;
  };
  const configuredOrigin = check(configured), authorizedOrigin = check(authorized);
  if (configuredOrigin !== authorizedOrigin) throw new Error('CRE_ORIGIN_AUTHORIZATION_MISMATCH');
  return configuredOrigin;
}
export function creProcessEnvironment(environment: Record<string, string | undefined>) {
  return Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'XDG_CONFIG_HOME'].flatMap(key => environment[key] ? [[key, environment[key]!]] : []));
}
export function relayOnlyEnvironment(secret: string | undefined) {
  if (!secret || secret.length < 32 || /[\r\n\0]/.test(secret)) throw new Error('CRE_RELAY_SECRET_REQUIRED');
  const quote = secret.includes("'") ? '"' : "'";
  if (secret.includes(quote)) throw new Error('CRE_RELAY_SECRET_REQUIRED');
  // Node dotenv does not unescape JSON quotes. Select a delimiter absent from the value.
  return `CRE_RELAY_SECRET=${quote}${secret}${quote}\n`;
}
