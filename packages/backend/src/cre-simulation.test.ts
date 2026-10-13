import { it, expect } from 'vitest';
import { parseEnv } from 'node:util';
import { approvedCreOrigin, creProcessEnvironment, relayOnlyEnvironment, creSimulationArguments, creSimulationOutcome } from './cre-simulation.js';

const log = (scanned: number, accepted: number, stale: number) => `Scanned ${scanned} plans; accepted ${accepted} job requests, skipped ${stale} stale candidates. Confirmed receipts are required for notifications.`;

it('requires an explicit origin and accepts the useful-work flag without ambiguous arguments', () => {
  for (const args of [['--authorized-origin', 'https://fallback.test'], ['--require-work', '--authorized-origin', 'https://fallback.test'], ['--authorized-origin', 'https://fallback.test', '--require-work']]) {
    expect(creSimulationArguments(args)).toEqual({ authorization: 'https://fallback.test', requireWork: args.includes('--require-work') });
  }
  for (const args of [[], ['--require-work'], ['--authorized-origin', 'https://fallback.test', '--other'], ['--require-work', '--require-work', '--authorized-origin', 'https://fallback.test']]) expect(() => creSimulationArguments(args)).toThrow('EXPLICIT_AUTHORIZED_ORIGIN_REQUIRED');
});

it('requires observed useful work for execution while retaining truthful empty simulation results', () => {
  expect(creSimulationOutcome(log(4, 0, 0), 0)).toMatchObject({ workflowResultVerified: true, usefulWorkVerified: false, exitCode: 0 });
  expect(creSimulationOutcome(log(4, 0, 0), 0, true)).toMatchObject({ workflowResultVerified: true, usefulWorkVerified: false, exitCode: 2 });
  expect(creSimulationOutcome(log(4, 0, 1), 0, true).exitCode).toBe(2);
  expect(creSimulationOutcome(log(4, 1, 0), 0, true)).toMatchObject({ result: { scanned: 4, accepted: 1, stale: 0 }, workflowResultVerified: true, usefulWorkVerified: true, exitCode: 0 });
});

it('refuses CLI-only success, failed runs and invalid or contradictory observations', () => {
  for (const diagnostic of ['', 'Scanned 4 plans; accepted 1 job requests', log(21, 1, 0), log(4, 3, 2), log(4, 1, 0) + '\n' + log(4, 0, 0)]) expect(creSimulationOutcome(diagnostic, 0, true)).toMatchObject({ workflowResultVerified: false, usefulWorkVerified: false, exitCode: 1 });
  expect(creSimulationOutcome(log(4, 1, 0), 1, true)).toMatchObject({ workflowResultVerified: false, usefulWorkVerified: false, exitCode: 1 });
  expect(creSimulationOutcome(log(4, 1, 0) + '\n' + log(4, 1, 0), 0, true).exitCode).toBe(0);
});

it('binds simulation to the explicitly authorized HTTPS origin and rejects placeholders/redirect-shaped URLs', () => {
  expect(approvedCreOrigin('https://fallback.test/', 'https://fallback.test')).toBe('https://fallback.test');
  expect(() => approvedCreOrigin('https://fallback.test', 'https://elsewhere.test')).toThrow('CRE_ORIGIN_AUTHORIZATION_MISMATCH');
  for (const value of ['https://CONFIGURE-AUTHORIZED-FALLBACK-HOST.example', 'http://fallback.test', 'https://user:password@fallback.test', 'https://fallback.test/path', 'https://fallback.test?redirect=elsewhere', 'https://localhost']) expect(() => approvedCreOrigin(value, value)).toThrow();
});

it('forwards only the relay variable and required CLI environment, preserving quoted secret bytes', () => {
  const value = 'local fixture #value with "quotes" and spaces';
  expect(parseEnv(relayOnlyEnvironment(value))).toEqual({ CRE_RELAY_SECRET: value });
  expect(creProcessEnvironment({ PATH: '/fixture/bin', HOME: '/fixture/home', PRIVY_APP_SECRET: 'fixture-private', WORKER_PRIVATE_KEY: 'fixture-key', DATABASE_URL: 'fixture-database', CRE_RELAY_SECRET: value, NODE_OPTIONS: '--import=unrelated' })).toEqual({ PATH: '/fixture/bin', HOME: '/fixture/home' });
  expect(() => relayOnlyEnvironment('short')).toThrow('CRE_RELAY_SECRET_REQUIRED');
  expect(() => relayOnlyEnvironment('a'.repeat(40) + '\nOTHER_SECRET=bad')).toThrow('CRE_RELAY_SECRET_REQUIRED');
});
