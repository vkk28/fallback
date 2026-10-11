import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { generateKeyPairSync, sign, verify as verifySignature } from 'node:crypto';
import { decodeFunctionData, encodeFunctionData, getAddress } from 'viem';
import { FallbackFactoryAbi } from '../../chain/src/FallbackFactory.js';
import { FallbackTestTokenAbi } from '../../chain/src/FallbackTestToken.js';
import { contractTerms } from '../../domain/src/terms.js';
import { matchesProposedTerms } from './receipts.js';
import { verifyAccessToken, APIError as ProviderAPIError, PrivyClient, formatRequestForAuthorizationSignature } from '@privy-io/node';
import { providerDiagnostic, providerReasonWords } from './provider-errors.js';
import type { User } from '@privy-io/node/resources';
import * as schema from './schema.js';
import type { Database } from './database.js';
import { createDraft, privatePlan, invite, invitation, acceptInvitation, bindAccount } from './plans.js';
import { idempotent, rateLimit, checkOrigin, body, relayAuth } from './security.js';
import { canonicalAccount } from './auth.js';
import * as authModule from './auth.js';
import * as chainModule from '../../chain/src/client.js';
import { outstandingRequest, prepareAction, submitSponsored, retrySponsored, executeSponsored, providerBody } from './transactions.js';

const recipient = { id: 'did:privy:recipient', address: '0x0000000000000000000000000000000000000100' };
const payee = { id: 'did:privy:payee', address: '0x0000000000000000000000000000000000000200' };
const attacker = { id: 'did:privy:attacker', address: '0x0000000000000000000000000000000000000300' };
const now = new Date('2026-10-07T12:00:00Z');
const input = { label: 'Housing payment', payee: payee.address, terms: { amount: '150000000', minimumReserve: '1000000', maximumReserve: '300000000', perPaymentCap: '150000000', firstDue: '1800000000', interval: '2592000', grace: '86400', fundingDeadline: '1795000000', coverBps: 10000, count: 3 } };

it('client signature covers the exact HTTP body/headers emitted by the installed Node SDK', async () => {
  const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const row = { id: '1'.repeat(64), destination: payee.address, calldata: '0x1234' };
  const expiry = Date.now() + 120_000;
  const formatted = { version: 1 as const, method: 'POST' as const, url: 'https://api.privy.io/v1/wallets/fixture-wallet/rpc', headers: { 'privy-app-id': 'fixture-app', 'privy-idempotency-key': row.id, 'privy-request-expiry': String(expiry) }, body: providerBody(row) };
  const bytes = formatRequestForAuthorizationSignature(formatted);
  const signature = sign('sha256', bytes, pair.privateKey).toString('base64');
  let captured: { url: string; valid: boolean; signature: string; body: unknown } | undefined;
  const client = new PrivyClient({ appId: 'fixture-app', appSecret: 'fixture-secret', maxRetries: 0, fetch: async (input, init) => {
    const request = new Request(input, init);
    const body = await request.json();
    const actual = formatRequestForAuthorizationSignature({ version: 1, method: 'POST', url: request.url, headers: { 'privy-app-id': request.headers.get('privy-app-id')!, 'privy-idempotency-key': request.headers.get('privy-idempotency-key')!, 'privy-request-expiry': request.headers.get('privy-request-expiry')! }, body });
    const header = request.headers.get('privy-authorization-signature')!;
    captured = { url: request.url, valid: verifySignature('sha256', actual, pair.publicKey, Buffer.from(header, 'base64')), signature: header, body };
    throw new Error('Deliberate transport fixture: no network or successful transaction');
  } });
  await expect(client.wallets().ethereum().sendTransaction('fixture-wallet', { caip2: 'eip155:10143', params: providerBody(row).params, sponsor: true, reference_id: row.id, idempotency_key: row.id, request_expiry: expiry, authorization_context: { signatures: [signature] } })).rejects.toThrow();
  expect(captured?.url).toBe(formatted.url);
  expect(captured?.body).toEqual(formatted.body);
  expect(captured?.signature).toBe(signature);
  expect(captured?.valid).toBe(true);
  const altered = formatRequestForAuthorizationSignature({ ...formatted, body: { ...formatted.body, sponsor: false } });
  expect(verifySignature('sha256', altered, pair.publicKey, Buffer.from(signature, 'base64'))).toBe(false);
});

it('returns only allowlisted provider diagnostics without exposing message contents', () => {
  const error = (message: string, code?: string) => new ProviderAPIError(400, { message, code }, undefined, new Headers());
  expect(providerDiagnostic(error('Insufficient gas credits balance'))).toBe('sponsorship_credits_unavailable');
  expect(providerDiagnostic(error('private fixture metadata', 'no_valid_user_session_keys'))).toBe('no_valid_user_session_keys');
  expect(providerDiagnostic(error('JWT authentication is not enabled for fixture-secret'))).toBe('user_jwt_authentication_rejected');
  expect(providerDiagnostic(error('unknown private fixture metadata'))).toBe('provider_request_rejected_unknown_reason');
  expect(providerDiagnostic(new Error('fixture-secret'))).toBe('provider_transport_or_unknown');
  expect(providerReasonWords(error('JWT authentication is not enabled for user123@example.com and abc.def.ghi'))).toBe('jwt authentication not enabled');
  expect(providerReasonWords(error('0x1234 https://private.example/token?secret=123 unknown fixture-private-value'))).toBe('');
});

it('proves exact proposed terms from immutable calldata even if execution chooses a later nonce', () => {
  const terms = contractTerms(input.terms, `0x${'11'.repeat(32)}`), expires = 1790000000n;
  const data = encodeFunctionData({ abi: FallbackFactoryAbi, functionName: 'propose', args: [getAddress(payee.address), terms, expires] });
  const event = { recipient: getAddress(recipient.address), payee: getAddress(payee.address), expires, terms, nonce: 9n };
  expect(matchesProposedTerms(data, recipient.address, event)).toBe(true);
  expect(matchesProposedTerms(data, attacker.address, event)).toBe(false);
  expect(matchesProposedTerms(data, recipient.address, { ...event, terms: { ...terms, amount: terms.amount + 1n } })).toBe(false);
  expect(matchesProposedTerms(data, recipient.address, { ...event, expires: expires + 1n })).toBe(false);
});

describe('PostgreSQL authorization and invitations (PGlite local SQL engine)', () => {
  let pg: PGlite, db: Database;
  beforeEach(async () => {
    pg = new PGlite(); db = drizzle(pg, { schema });
    await migrate(drizzle(pg, { schema }), { migrationsFolder: 'infra/migrations' });
  });
  afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllEnvs(); await pg.close(); });
  it('mints only bounded valueless test tokens to the verified funder, never an arbitrary destination', async () => {
    const p = await db.transaction(tx => createDraft(tx, recipient, input, now));
    await db.update(schema.plans).set({ address: attacker.address }).where(eq(schema.plans.id, p.id));
    const config = { chain: { id: 10143 }, factory: payee.address, token: payee.address, client: { getChainId: async () => 10143 } } as unknown as ReturnType<typeof chainModule.chainClient>;
    vi.spyOn(chainModule, 'chainClient').mockReturnValue(config);
    vi.spyOn(chainModule, 'registeredPlan').mockResolvedValue({ ...config, plan: attacker.address } as Awaited<ReturnType<typeof chainModule.registeredPlan>>);
    const actor = { ...recipient, walletId: 'fixture-wallet', sessionId: 'fixture-session' };
    const call = await prepareAction(db, actor, { planId: p.id, action: 'mintTestTokens', amount: '250000000' });
    const decoded = decodeFunctionData({ abi: FallbackTestTokenAbi, data: call.data });
    expect(call.to).toBe(config.token);
    expect(decoded).toMatchObject({ functionName: 'mint', args: [getAddress(recipient.address), 250000000n] });
    await expect(prepareAction(db, actor, { planId: p.id, action: 'mintTestTokens', amount: '450000001' })).rejects.toMatchObject({ code: 'TEST_TOKEN_AMOUNT_LIMIT' });
    await expect(prepareAction(db, actor, { planId: p.id, action: 'mintTestTokens', amount: '1', destination: attacker.address })).rejects.toThrow();
  });
  it('recovers an ambiguous stored request, isolates it, and blocks a second key from sending again', async () => {
    const p = await db.transaction(tx => createDraft(tx, recipient, input, now));
    await db.update(schema.plans).set({ address: attacker.address }).where(eq(schema.plans.id, p.id));
    // Deliberately failing transport fixture: this test establishes durable request
    // identity and isolation, not a provider or blockchain integration success.
    const send = vi.fn().mockRejectedValue(new Error('ambiguous transport failure'));
    vi.stubEnv('PRIVY_SERVER_SPONSORSHIP_ENABLED', 'true');
    vi.stubEnv('NEXT_PUBLIC_PRIVY_APP_ID', 'fixture-app');
    vi.spyOn(authModule, 'privyClient').mockReturnValue({ wallets: () => ({ ethereum: () => ({ sendTransaction: send }) }) } as unknown as ReturnType<typeof authModule.privyClient>);
    const config = { chain: { id: 10143 }, factory: payee.address, token: payee.address, client: { getChainId: async () => 10143, call: async () => ({ data: '0x' }) } } as unknown as ReturnType<typeof chainModule.chainClient>;
    vi.spyOn(chainModule, 'chainClient').mockReturnValue(config);
    vi.spyOn(chainModule, 'registeredPlan').mockResolvedValue({ ...config, plan: attacker.address } as Awaited<ReturnType<typeof chainModule.registeredPlan>>);
    const actor = { ...recipient, walletId: 'fixture-wallet', sessionId: 'fixture-session' };
    const request = (key: string) => new Request('http://localhost/api/transactions', { headers: { authorization: 'Bearer fixture', 'idempotency-key': key } });
    const prepared = await submitSponsored(db, actor, request('original_request_001'), { planId: p.id, action: 'activate' });
    expect(prepared).toHaveProperty('payloadBase64');
    expect(send).not.toHaveBeenCalled();
    const authorized = { signature: 'Zml4dHVyZV9zaWduYXR1cmU=', requestExpiry: Date.now() + 120_000 };
    await expect(executeSponsored(db, actor, prepared.requestId, authorized)).rejects.toMatchObject({ status: 502 });
    const pending = await outstandingRequest(db, actor.id, p.id);
    expect(pending?.status).toBe('prepared');
    expect(await outstandingRequest(db, attacker.id, p.id)).toBeUndefined();
    await expect(submitSponsored(db, actor, request('different_request_002'), { planId: p.id, action: 'activate' })).rejects.toMatchObject({ code: 'PENDING_ACTION_CONFIRM_FIRST' });
    expect(send).toHaveBeenCalledTimes(1);
    await expect(retrySponsored(db, { ...attacker, walletId: 'attacker-wallet', sessionId: 'attacker-session' }, request('irrelevant_key_003'), pending!.id)).rejects.toMatchObject({ status: 404 });
    const recovered = await retrySponsored(db, actor, request('irrelevant_key_003'), pending!.id);
    expect(recovered.requestId).toBe(prepared.requestId);
    expect(send).toHaveBeenCalledTimes(1);
    await expect(executeSponsored(db, actor, pending!.id, { ...authorized, destination: attacker.address })).rejects.toThrow();
    await expect(executeSponsored(db, actor, pending!.id, { ...authorized, requestExpiry: Date.now() - 1 })).rejects.toMatchObject({ status: 409 });
    await expect(retrySponsored(db, { ...actor, walletId: 'changed-wallet' }, request('irrelevant_key_003'), pending!.id)).rejects.toMatchObject({ code: 'PROVIDER_WALLET_CHANGED_RECONCILE' });
    await expect(executeSponsored(db, actor, pending!.id, authorized)).rejects.toMatchObject({ status: 502 });
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0]![1].idempotency_key).toBe(send.mock.calls[1]![1].idempotency_key);
    expect(send.mock.calls[0]![1].authorization_context).toEqual({ signatures: [authorized.signature] });
    expect(await db.query.transactionRequests.findFirst()).not.toHaveProperty('signature');
  });
  it('rejects private object enumeration and canonical account changes', async () => {
    const p = await db.transaction(tx => createDraft(tx, recipient, input, now));
    expect((await privatePlan(db, recipient, p.id)).label).toBe(input.label);
    await expect(privatePlan(db, attacker, p.id)).rejects.toMatchObject({ status: 404 });
    await expect(bindAccount(db, { ...recipient, address: attacker.address })).rejects.toMatchObject({ status: 409 });
  });
  it('binds a high-entropy invitation to one exact account and prevents replay', async () => {
    const p = await db.transaction(tx => createDraft(tx, recipient, input, now));
    const link = await invite(db, recipient, p.id, 'payee', payee.address, now);
    expect(link.token).toHaveLength(43);
    const stored = await db.query.invitations.findFirst();
    expect(stored?.digest).not.toBe(link.token);
    expect(await invitation(db, link.token, now)).not.toHaveProperty('salt');
    await expect(db.transaction(tx => acceptInvitation(tx, attacker, link.token, now))).rejects.toMatchObject({ status: 403 });
    await db.transaction(tx => acceptInvitation(tx, payee, link.token, now));
    expect((await privatePlan(db, payee, p.id)).role).toBe('payee');
    await expect(db.transaction(tx => acceptInvitation(tx, payee, link.token, now))).rejects.toMatchObject({ status: 410 });
  });
  it('expires invitations and rejects supporters before immutable terms are published', async () => {
    const p = await db.transaction(tx => createDraft(tx, recipient, input, now));
    const link = await invite(db, recipient, p.id, 'payee', payee.address, now);
    await expect(invitation(db, link.token, new Date(now.getTime() + 86400_000))).rejects.toMatchObject({ status: 410 });
    await expect(invite(db, recipient, p.id, 'supporter', attacker.address, now)).rejects.toMatchObject({ status: 409 });
    await expect(invite(db, payee, p.id, 'payee', payee.address, now)).rejects.toMatchObject({ status: 404 });
  });
  it('executes a keyed mutation once, refuses altered payload replay, and isolates users', async () => {
    let calls = 0;
    const action = async () => ({ calls: ++calls });
    expect(await idempotent(db, recipient.id, 'one_request_key_001', 'payload-one', action)).toEqual({ calls: 1 });
    expect(await idempotent(db, recipient.id, 'one_request_key_001', 'payload-one', action)).toEqual({ calls: 1 });
    await expect(idempotent(db, recipient.id, 'one_request_key_001', 'different', action)).rejects.toMatchObject({ status: 409 });
    expect(await idempotent(db, payee.id, 'one_request_key_001', 'payload-one', action)).toEqual({ calls: 2 });
    await expect(idempotent(db, recipient.id, null, 'payload', action)).rejects.toMatchObject({ status: 400 });
  });
  it('enforces a durable rate window and recovers after expiry', async () => {
    await rateLimit(db, recipient.id, 2, now); await rateLimit(db, recipient.id, 2, now);
    await expect(rateLimit(db, recipient.id, 2, now)).rejects.toMatchObject({ status: 429 });
    await rateLimit(db, recipient.id, 2, new Date(now.getTime() + 60000));
  });
  it('rejects origins, oversized body, and invalid relay credentials', async () => {
    expect(() => checkOrigin(new Request('https://fallback.test/api', { headers: { origin: 'https://attacker.test' } }), 'https://fallback.test')).toThrow();
    expect(() => relayAuth(new Request('https://fallback.test'), 's'.repeat(32))).toThrow();
    const request = new Request('https://fallback.test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify('s'.repeat(16385)) });
    await expect(body(request)).rejects.toMatchObject({ status: 413 });
  });
});

describe('actual installed Privy verifier with locally generated cryptographic fixtures', () => {
  const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const publicKey = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const jwt = (override: Record<string, unknown> = {}) => {
    const part = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
    const data = part({ alg: 'ES256', typ: 'JWT' }) + '.' + part({ iss: 'privy.io', aud: 'fixture-app', sub: recipient.id, sid: 'fixture-session', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60, ...override });
    return data + '.' + sign('sha256', Buffer.from(data), { key: pair.privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  };
  it('verifies signatures and rejects expired, wrong audience, and corrupted tokens', async () => {
    const verify = (access_token: string) => verifyAccessToken({ app_id: 'fixture-app', verification_key: publicKey, access_token });
    expect((await verify(jwt())).user_id).toBe(recipient.id);
    await expect(verify(jwt({ exp: 1 }))).rejects.toThrow();
    await expect(verify(jwt({ aud: 'different-app' }))).rejects.toThrow();
    await expect(verify(jwt() + 'corrupt')).rejects.toThrow();
  });
  it('never chooses external wallets or ambiguous embedded accounts as the canonical account', () => {
    const wallet = { type: 'wallet', chain_type: 'ethereum', connector_type: 'embedded', wallet_client_type: 'privy', wallet_index: 0, address: recipient.address, id: 'fixture-wallet' };
    const user = { id: recipient.id, linked_accounts: [wallet] } as User;
    expect(canonicalAccount(user).address).toBe(recipient.address);
    expect(() => canonicalAccount({ ...user, linked_accounts: [] })).toThrow();
    expect(() => canonicalAccount({ ...user, linked_accounts: [wallet, wallet] } as User)).toThrow();
  });
});
