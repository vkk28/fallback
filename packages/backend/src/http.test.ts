import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateKeyPairSync, sign } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import * as schema from './schema.js';
import * as storage from './database.js';
import * as chain from '../../chain/src/client.js';
import { createDraft } from './plans.js';
import { GET, POST } from '../../../apps/web/app/api/[...path]/route.js';

// Exercise the actual HTTP handlers and installed cryptographic token verifier.
// Provider user lookup and chain availability are controlled local fixtures.
const provider = vi.hoisted(() => ({ key: '', users: new Map<string, unknown>(), unavailable: false }));
vi.mock('@privy-io/node', async importOriginal => {
  const actual = await importOriginal<typeof import('@privy-io/node')>();
  return { ...actual, PrivyClient: class {
    utils() { return { auth: () => ({ verifyAccessToken: (access_token: string) => actual.verifyAccessToken({ app_id: 'http-fixture', verification_key: provider.key, access_token }) }) }; }
    users() { return { _get: async (id: string) => { if (provider.unavailable) throw new Error('private provider error'); return provider.users.get(id); } }; }
  } };
});

const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
provider.key = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
const actors = ['recipient', 'payee', 'supporter', 'outsider'].map((role, i) => ({ id: `did:fixture:${role}`, address: `0x${(i + 1).toString(16).padStart(40, '0')}`, walletId: `wallet-${role}` }));
const [recipient, payee, supporter, outsider] = actors;
const origin = 'http://localhost:3000';
function token(id: string, overrides: Record<string, unknown> = {}) {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const bytes = part({ alg: 'ES256', typ: 'JWT' }) + '.' + part({ iss: 'privy.io', aud: 'http-fixture', sub: id, sid: `session-${id}`, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60, ...overrides });
  return bytes + '.' + sign('sha256', Buffer.from(bytes), { key: pair.privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
}
describe('HTTP authorization/session/recovery matrix with local SQL and signed fixtures', () => {
  let pg: PGlite, db: storage.Database, planId: string;
  async function call(path: string, actor = recipient!, method = 'GET', input?: unknown, headers: Record<string, string> = {}) {
    const request = new Request(`${origin}/api/${path}`, { method, headers: { authorization: `Bearer ${token(actor.id)}`, ...(method === 'POST' ? { origin, 'content-type': 'application/json', 'idempotency-key': 'http_fixture_key_001' } : {}), ...headers }, ...(input === undefined ? {} : { body: JSON.stringify(input) }) });
    const response = await (method === 'GET' ? GET : POST)(request, { params: Promise.resolve({ path: path.split('/') }) });
    expect(response.headers.get('cache-control')).toBe('no-store, private');
    return { status: response.status, data: await response.json() };
  }
  beforeEach(async () => {
    pg = new PGlite(); db = drizzle(pg, { schema });
    await migrate(drizzle(pg, { schema }), { migrationsFolder: 'infra/migrations' });
    vi.spyOn(storage, 'database').mockReturnValue(db);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('NEXT_PUBLIC_PRIVY_APP_ID', 'http-fixture'); vi.stubEnv('PRIVY_APP_SECRET', 'fixture-only'); vi.stubEnv('APP_ORIGIN', origin);
    provider.unavailable = false; provider.users.clear();
    for (const a of actors) {
      provider.users.set(a.id, { id: a.id, linked_accounts: [{ type: 'wallet', chain_type: 'ethereum', wallet_client_type: 'privy', connector_type: 'embedded', wallet_index: 0, id: a.walletId, address: a.address }] });
      await db.insert(schema.accounts).values({ id: a.id, address: a.address });
    }
    const now = Math.floor(Date.now() / 1000);
    const p = await db.transaction(tx => createDraft(tx, recipient!, { label: 'Private housing fixture', payee: payee!.address, terms: { amount: '1000000', minimumReserve: '1000000', maximumReserve: '2000000', perPaymentCap: '1000000', firstDue: String(now + 10000), fundingDeadline: String(now + 5000), interval: '86400', grace: '3600', count: 1, coverBps: 10000 } }));
    planId = p.id;
    await db.update(schema.plans).set({ address: `0x${'5'.repeat(40)}` }).where(eq(schema.plans.id, planId));
    for (const [a, role] of [[payee!, 'payee'], [supporter!, 'supporter']] as const) await db.insert(schema.memberships).values({ planId, userId: a.id, role });
    for (const a of actors) await db.insert(schema.notifications).values({ id: `notification-${a.id}`, planId, userId: a.id, type: `private-${a.id}` });
    vi.spyOn(chain, 'chainClient').mockReturnValue({ chain: { id: 10143 }, token: `0x${'6'.repeat(40)}`, factory: `0x${'7'.repeat(40)}`, client: { getChainId: async () => 10143 } } as unknown as ReturnType<typeof chain.chainClient>);
    vi.spyOn(chain, 'planSnapshot').mockRejectedValue(new Error('private RPC URL/timeout'));
  });
  afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllEnvs(); await pg.close(); });

  it.each(['', 'Basic fixture', 'Bearer invalid', 'expired', 'wrong-audience', 'corrupted'])('rejects %s credentials before any private read or write', async authorization => {
    const values: Record<string, string> = { expired: `Bearer ${token(recipient!.id, { exp: 1 })}`, 'wrong-audience': `Bearer ${token(recipient!.id, { aud: 'another-app' })}`, corrupted: `Bearer ${token(recipient!.id)}bad` };
    expect(await call('plans', recipient!, 'GET', undefined, { authorization: values[authorization] ?? authorization })).toMatchObject({ status: 401 });
    expect(await call('profile', recipient!, 'POST', { displayName: 'Unaccepted' }, { authorization: values[authorization] ?? authorization })).toMatchObject({ status: 401 });
    expect(await db.select().from(schema.requestKeys)).toHaveLength(0);
    expect((await db.select().from(schema.accounts)).every(a => a.displayName === null)).toBe(true);
  });
  it('isolates role sessions, plan enumeration, notifications and durable requests', async () => {
    for (const a of actors.slice(0, 3)) {
      const list = await call('plans', a); expect(list.status).toBe(200); expect(list.data).toHaveLength(1);
      expect(list.data[0].role).toBe(a.id.split(':').at(-1));
      const messages = await call('notifications', a); expect(messages.data).toHaveLength(1); expect(messages.data[0].userId).toBe(a.id);
    }
    expect((await call('plans', outsider!)).data).toEqual([]);
    expect(await call(`plans/${planId}`, outsider!)).toMatchObject({ status: 404, data: { error: 'PLAN_NOT_FOUND' } });
    expect(await call(`plans/${planId}/history`, outsider!)).toMatchObject({ status: 404 });
    await db.insert(schema.transactionRequests).values({ id: 'a'.repeat(64), userId: recipient!.id, planId, action: 'activate', fingerprint: 'fixture', walletId: recipient!.walletId, destination: `0x${'5'.repeat(40)}`, calldata: '0x', status: 'submitted' });
    for (const a of [payee!, supporter!, outsider!]) {
      expect(await call(`transactions/${'a'.repeat(64)}`, a)).toMatchObject({ status: 404 });
      expect(await call(`transactions/${'a'.repeat(64)}/retry`, a, 'POST', {})).toMatchObject({ status: 404 });
    }
    expect(await db.select().from(schema.transactionRequests)).toHaveLength(1);
  });
  it('rejects forbidden role actions and foreign origins without creating requests', async () => {
    vi.stubEnv('PRIVY_SERVER_SPONSORSHIP_ENABLED', 'true');
    for (const [a, action] of [[payee!, 'activate'], [supporter!, 'cancel'], [recipient!, 'contribute']] as const) expect(await call('transactions', a, 'POST', { planId, action, amount: '1' })).toMatchObject({ status: 403 });
    expect(await call('profile', recipient!, 'POST', { displayName: 'Unaccepted' }, { origin: 'https://foreign.example' })).toMatchObject({ status: 403 });
    expect(await db.select().from(schema.transactionRequests)).toHaveLength(0); expect(await db.select().from(schema.requestKeys)).toHaveLength(0);
  });
  it('preserves an outstanding action and private response during RPC/indexer outages', async () => {
    vi.stubEnv('ENVIO_GRAPHQL_URL', 'http://127.0.0.1:1/v1/graphql');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private indexer outage')));
    try {
      await db.insert(schema.transactionRequests).values({ id: 'a'.repeat(64), userId: recipient!.id, planId, action: 'activate', fingerprint: 'fixture', destination: `0x${'5'.repeat(40)}`, calldata: '0x', status: 'submitted' });
      const result = await call(`plans/${planId}`);
      expect(result).toMatchObject({ status: 200, data: { current: null, history: null, fundingApproval: null, indexerStatus: 'unavailable', outstanding: { id: 'a'.repeat(64) } } });
      expect(result.data.chainError).toContain('Refresh before authorizing');
      expect(JSON.stringify(result.data)).not.toContain('private RPC');
      expect(await db.select().from(schema.transactionRequests)).toHaveLength(1);
    } finally { vi.unstubAllGlobals(); }
  });
  it('rejects changed accounts and provider outages, then reconnects without losing records', async () => {
    provider.unavailable = true; expect(await call('plans')).toMatchObject({ status: 401 });
    provider.unavailable = false;
    const user = provider.users.get(recipient!.id) as { id: string; linked_accounts: Array<{ address: string }> };
    user.linked_accounts[0]!.address = `0x${'9'.repeat(40)}`;
    expect(await call('plans')).toMatchObject({ status: 409, data: { error: 'ACCOUNT_BINDING_CHANGED' } });
    user.linked_accounts[0]!.address = recipient!.address;
    expect((await call('plans')).data).toHaveLength(1);
    expect(await db.select().from(schema.plans)).toHaveLength(1);
  });
  it('binds a first-time invitation through server-verified email without trusting client identity fields', async () => {
    vi.stubEnv('INVITATION_TOKEN_KEY', 'http-invitation-fixture-only-'.repeat(2));
    const original = await db.query.plans.findFirst({ where: eq(schema.plans.id, planId) });
    const fresh = await db.transaction(tx => createDraft(tx, recipient!, { label: 'New-person HTTP fixture', payee: null, terms: original!.terms }));
    const input = { planId: fresh.id, role: 'payee', email: 'new-person@example.invalid' };
    const link = await call('invitations', recipient!, 'POST', input, { 'idempotency-key': 'new_person_invite_001' });
    expect(link.status).toBe(200);
    expect(await call('invitations', recipient!, 'POST', input, { 'idempotency-key': 'new_person_invite_001' })).toEqual(link);
    const stored = await db.query.requestKeys.findFirst({ where: eq(schema.requestKeys.key, 'new_person_invite_001') });
    expect(JSON.stringify(stored)).not.toContain(link.data.token);
    expect((await call('requests', outsider!)).data).toEqual([]);
    expect(await call('invitations/accept', outsider!, 'POST', { token: link.data.token })).toMatchObject({ status: 403, data: { error: 'INVITED_EMAIL_REQUIRED' } });
    const user = provider.users.get(payee!.id) as { linked_accounts: unknown[] };
    user.linked_accounts.push({ type: 'email', address: 'new-person@example.invalid', verified_at: 100 });
    expect((await call('requests', payee!)).data).toHaveLength(1);
    expect((await call('session', payee!)).data).not.toHaveProperty('verifiedEmailDigests');
    expect(await call('invitations/accept', payee!, 'POST', { token: link.data.token, verifiedEmailDigests: ['client-forged'] })).toMatchObject({ status: 400 });
    const joined = await call('invitations/accept', payee!, 'POST', { token: link.data.token }, { 'idempotency-key': 'new_person_accept_001' });
    expect(joined).toMatchObject({ status: 200, data: { planId: fresh.id, onchainAcceptanceRequired: true } });
    expect((await call(`plans/${fresh.id}`, payee!)).data.plan).toMatchObject({ payee: payee!.address, proposalHash: null, role: 'payee' });
    expect(await call('invitations/revoke', recipient!, 'POST', { id: link.data.id }, { 'idempotency-key': 'new_person_revoke_001' })).toMatchObject({ status: 409 });
    expect((await call(`plans/${planId}`)).data.plan.payee).toBe(original!.payee);
    expect(await db.query.transactionRequests.findMany()).toEqual([]);
  });
  it('does not acknowledge another session’s notification as read', async () => {
    expect(await call('notifications/read', supporter!, 'POST', { id: `notification-${recipient!.id}` })).toMatchObject({ status: 200 });
    expect((await db.query.notifications.findFirst({ where: eq(schema.notifications.id, `notification-${recipient!.id}`) }))?.readAt).toBeNull();
  });
  it('keeps preliminary setup private and atomically creates a fresh draft without editing the existing plan', async () => {
    const fields = { label: 'Private preliminary fixture', payee: '', amount: '', firstDue: '', days: '30', count: '3', grace: '48', minimum: '', maximum: '', cap: '', percent: '100' };
    expect(await call('setup-draft', recipient!, 'POST', { fields, step: 0, version: 0 }, { 'idempotency-key': 'ui_setup_save_001' })).toMatchObject({ status: 200, data: { version: 1 } });
    expect((await call('setup-draft', outsider!)).data).toBeNull();
    expect((await call('requests', outsider!)).data).toEqual([]);
    expect(await call(`requests/${'a'.repeat(64)}`, outsider!)).toMatchObject({ status: 404 });
    const before = (await call(`plans/${planId}`)).data.plan;
    const finish = { version: 1, draft: { label: 'Fresh setup fixture', payee: before.payee, terms: before.terms } };
    expect(await call('setup-finish', recipient!, 'POST', { ...finish, draft: {} }, { 'idempotency-key': 'ui_setup_invalid_001' })).toMatchObject({ status: 400 });
    expect((await call('setup-draft')).data.version).toBe(1);
    const result = await call('setup-finish', recipient!, 'POST', finish, { 'idempotency-key': 'ui_setup_finish_001' });
    expect(result.status).toBe(200); expect(result.data.id).not.toBe(planId);
    expect(await call('setup-finish', recipient!, 'POST', finish, { 'idempotency-key': 'ui_setup_finish_001' })).toEqual(result);
    expect((await call('setup-draft')).data).toBeNull();
    expect((await call(`plans/${planId}`)).data.plan.terms).toEqual(before.terms);
    expect(await db.select().from(schema.plans)).toHaveLength(2);
    expect(await db.select().from(schema.transactionRequests)).toHaveLength(0);
  });
});
