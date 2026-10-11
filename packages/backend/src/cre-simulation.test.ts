import { it, expect } from 'vitest';
import { parseEnv } from 'node:util';
import { approvedCreOrigin, creProcessEnvironment, relayOnlyEnvironment } from './cre-simulation.js';

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
