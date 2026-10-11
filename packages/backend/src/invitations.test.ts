import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import type { User } from '@privy-io/node/resources';
import * as schema from './schema.js';
import type { Database } from './database.js';
import { createDraft, privatePlan } from './plans.js';
import { acceptInvitation, createInvitation, invitation, ownerInvitations, respondInvitation, revokeInvitation } from './invitations.js';
import { contactDigest, deliverInvitation } from './invitation-delivery.js';
import { requestInbox } from './experience.js';
import { verifiedEmailDigests } from './auth.js';
import { prepareAction } from './transactions.js';
import { idempotent } from './security.js';
import * as chain from '../../chain/src/client.js';

const owner = { id: 'claim-owner', address: '0x0000000000000000000000000000000000000100' };
const payee = { id: 'first-time-payee', address: '0x0000000000000000000000000000000000000200' };
const stranger = { id: 'claim-stranger', address: '0x0000000000000000000000000000000000000300' };
const now = new Date();
const terms = { amount: '1000000', minimumReserve: '1000000', maximumReserve: '3000000', perPaymentCap: '1000000', firstDue: '1800000000', interval: '86400', grace: '3600', fundingDeadline: '1795000000', coverBps: 10000, count: 3 };
let pg: PGlite, db: Database, planId: string;
const newToken = () => randomBytes(32).toString('base64url');
async function issue(input: Record<string, unknown> = {}, token = newToken()) {
  const metadata = await db.transaction(tx => createInvitation(tx, owner, { planId, role: 'payee', ...input }, token, now));
  return { ...metadata, token };
}
beforeEach(async () => {
  vi.stubEnv('INVITATION_TOKEN_KEY', 'local-fixture-only-'.repeat(3));
  vi.stubEnv('INVITATION_DELIVERY_KEY', 'ab'.repeat(32));
  vi.stubEnv('INVITATION_APP_ORIGIN', 'https://fallback.example.invalid');
  vi.stubEnv('INVITATION_EMAIL_FROM', 'invite@example.invalid');
  vi.stubEnv('RESEND_API_KEY', 'local-fixture-not-a-provider-key');
  pg = new PGlite(); db = drizzle(pg, { schema });
  await migrate(drizzle(pg, { schema }), { migrationsFolder: 'infra/migrations' });
  planId = (await db.transaction(tx => createDraft(tx, owner, { label: 'Private onboarding fixture', payee: null, terms }, now))).id;
});
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllEnvs(); await pg.close(); });
it('binds a first-time secure-link claimant before financial consent and blocks unbound financial preparation', async () => {
  await expect(prepareAction(db, { ...owner, walletId: 'fixture', sessionId: 'fixture' }, { planId, action: 'propose' })).rejects.toMatchObject({ code: 'PAYEE_CLAIM_REQUIRED' });
  expect(await db.query.accounts.findFirst({ where: eq(schema.accounts.id, payee.id) })).toBeUndefined();
  const link = await issue();
  expect(await requestInbox(db, stranger, now)).toEqual([]);
  expect(await invitation(db, link.token, now)).toMatchObject({ payee: null, intendedAddress: null });
  expect(await acceptInvitation(db, payee, link.token, now)).toMatchObject({ onchainAcceptanceRequired: true });
  const p = await privatePlan(db, payee, planId);
  expect(p).toMatchObject({ payee: payee.address, proposalHash: null, address: null, role: 'payee' });
  expect(await db.query.transactionRequests.findMany()).toEqual([]);
  expect(await db.query.notifications.findMany()).toEqual([]);
  await expect(acceptInvitation(db, stranger, link.token, now)).rejects.toMatchObject({ status: 410 });
});
it('requires current server-verified email even with a copied token and reveals no contact identity', async () => {
  const link = await issue({ email: 'Invitee@Example.invalid' });
  const intended = { ...payee, verifiedEmailDigests: [contactDigest('invitee@example.invalid')] };
  await expect(acceptInvitation(db, payee, link.token, now)).rejects.toMatchObject({ code: 'INVITED_EMAIL_REQUIRED' });
  expect(await requestInbox(db, payee, now)).toEqual([]);
  expect(await requestInbox(db, intended, now)).toHaveLength(1);
  await acceptInvitation(db, intended, link.token, now);
  const rows = JSON.stringify(await ownerInvitations(db, owner, planId, now));
  expect(rows).not.toContain('invitee@example.invalid'); expect(rows).not.toContain(link.token);
});
it('rejects fabricated unverified/imported and OAuth email claims', () => {
  const user = { linked_accounts: [{ type: 'email', address: 'one@example.invalid', verified_at: 0 }, { type: 'email', address: 'two@example.invalid', verified_at: 100 }, { type: 'google_oauth', email: 'three@example.invalid', verified_at: 100 }] } as unknown as User;
  expect(verifiedEmailDigests(user)).toEqual([contactDigest('two@example.invalid')]);
});
it('replaces a link atomically and preserves revoked, declined, exact-expiry and single-use boundaries', async () => {
  const first = await issue();
  await expect(issue()).rejects.toMatchObject({ code: 'REPLACE_EXISTING_INVITATION' });
  const second = await issue({ replace: first.id });
  await expect(invitation(db, first.token, now)).rejects.toMatchObject({ code: 'INVITATION_REPLACED' });
  await db.transaction(tx => revokeInvitation(tx, owner, second.id, now));
  await expect(acceptInvitation(db, payee, second.token, now)).rejects.toMatchObject({ code: 'INVITATION_REVOKED' });
  const third = await issue({ replace: second.id });
  await respondInvitation(db, payee, { token: third.token }, true, now);
  await expect(acceptInvitation(db, payee, third.token, now)).rejects.toMatchObject({ code: 'INVITATION_DECLINED' });
  await expect(privatePlan(db, payee, planId)).rejects.toMatchObject({ status: 404 });
  const fourth = await issue({ replace: third.id });
  await expect(acceptInvitation(db, payee, fourth.token, new Date(fourth.expiresAt))).rejects.toMatchObject({ status: 410 });
  expect((await privatePlan(db, owner, planId)).payee).toBeNull();
});
it('never rebinds an existing destination/proposal and never revokes accepted membership', async () => {
  await db.update(schema.plans).set({ payee: payee.address, proposalHash: '0x' + '01'.repeat(32) }).where(eq(schema.plans.id, planId));
  const link = await issue();
  await expect(acceptInvitation(db, stranger, link.token, now)).rejects.toMatchObject({ code: 'INVITED_ACCOUNT_REQUIRED' });
  await acceptInvitation(db, payee, link.token, now);
  await expect(db.transaction(tx => revokeInvitation(tx, owner, link.id, now))).rejects.toMatchObject({ code: 'INVITATION_ALREADY_USED' });
  await expect(issue({ replace: link.id })).rejects.toMatchObject({ code: 'INVITATION_ALREADY_USED' });
  expect((await privatePlan(db, payee, planId)).payee).toBe(payee.address);
});
it('rejects role overlap and refuses support claims when authoritative funding is closed or unknown', async () => {
  const own = await issue();
  await expect(acceptInvitation(db, owner, own.token, now)).rejects.toMatchObject({ code: 'INVITATION_ROLE_MISMATCH' });
  await db.update(schema.plans).set({ payee: payee.address, address: stranger.address }).where(eq(schema.plans.id, planId));
  const snapshot = vi.spyOn(chain, 'planSnapshot').mockResolvedValue({ lifecycle: 0, timestamp: 1791719999n } as Awaited<ReturnType<typeof chain.planSnapshot>>);
  const support = await issue({ role: 'supporter' });
  await issue({ role: 'supporter', email: 'backup@example.invalid' });
  await expect(issue({ role: 'supporter', email: 'backup@example.invalid' })).rejects.toMatchObject({ code: 'REPLACE_EXISTING_INVITATION' });
  await expect(acceptInvitation(db, payee, support.token, now)).rejects.toMatchObject({ code: 'INVITATION_ROLE_MISMATCH' });
  snapshot.mockResolvedValue({ lifecycle: 1, timestamp: 1791719999n } as Awaited<ReturnType<typeof chain.planSnapshot>>);
  await expect(acceptInvitation(db, stranger, support.token, now)).rejects.toMatchObject({ code: 'INVITATION_FUNDING_CLOSED' });
  snapshot.mockRejectedValue(new Error('controlled RPC unavailable'));
  await expect(acceptInvitation(db, stranger, support.token, now)).rejects.toThrow('controlled RPC unavailable');
  expect((await db.query.invitations.findFirst({ where: eq(schema.invitations.digest, support.id) }))?.consumedBy).toBeNull();
});
it('isolates owner management and restores an accepted response by its original idempotency key', async () => {
  const link = await issue();
  await expect(ownerInvitations(db, stranger, planId, now)).rejects.toMatchObject({ status: 404 });
  const run = () => idempotent(db, payee.id, 'claim-recovery-key-01', 'same-fixture', tx => acceptInvitation(tx, payee, link.token, now));
  expect(await run()).toEqual(await run());
  expect(await db.query.memberships.findMany()).toHaveLength(2);
  await expect(ownerInvitations(db, payee, planId, now)).rejects.toMatchObject({ status: 403 });
});
it('does not prepare email without contact consent and rejects unreachable origins before any invitation commits', async () => {
  await issue({ email: 'invitee@example.invalid' });
  expect(await db.query.invitationDeliveries.findMany()).toEqual([]);
  const existing = await db.query.invitations.findFirst();
  vi.stubEnv('INVITATION_APP_ORIGIN', 'http://localhost:3000');
  await expect(issue({ email: 'invitee@example.invalid', deliveryConsent: true, replace: existing!.digest })).rejects.toMatchObject({ code: 'REACHABLE_INVITATION_ORIGIN_REQUIRED' });
  expect((await db.query.invitations.findFirst())?.revokedAt).toBeNull();
});
it('encrypts delivery material and uses the exact same provider body/key after lost response; acceptance is not delivery', async () => {
  const link = await issue({ email: 'invitee@example.invalid', deliveryConsent: true });
  const row = await db.query.invitationDeliveries.findFirst();
  expect(row!.envelope).not.toContain(link.token); expect(row!.envelope).not.toContain('invitee@example.invalid');
  const transport = vi.fn<typeof fetch>().mockRejectedValueOnce(new Error('controlled lost response')).mockResolvedValue(new Response(JSON.stringify({ id: 'fixture-email-id' }), { status: 200 }));
  const at = new Date();
  expect(await deliverInvitation(db, owner, link.id, at, transport)).toEqual({ status: 'retry', delivered: false });
  await expect(deliverInvitation(db, owner, link.id, at, transport)).rejects.toMatchObject({ code: 'EMAIL_RETRY_LATER' });
  expect(await deliverInvitation(db, owner, link.id, new Date(at.getTime() + 30_000), transport)).toEqual({ status: 'accepted', delivered: false });
  expect(transport.mock.calls[0]![1]!.body).toBe(transport.mock.calls[1]![1]!.body);
  expect(new Headers(transport.mock.calls[0]![1]!.headers).get('idempotency-key')).toBe(new Headers(transport.mock.calls[1]![1]!.headers).get('idempotency-key'));
  await deliverInvitation(db, owner, link.id, new Date(at.getTime() + 60_000), transport);
  expect(transport).toHaveBeenCalledTimes(2); expect(await db.query.memberships.findMany()).toHaveLength(1);
});
it('blocks revoked deliveries, rejects unrelated senders and bounds ambiguous/throttled retry age', async () => {
  const link = await issue({ email: 'invitee@example.invalid', deliveryConsent: true });
  const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 429 }));
  await expect(deliverInvitation(db, stranger, link.id, now, transport)).rejects.toMatchObject({ status: 404 });
  const at = new Date();
  await deliverInvitation(db, owner, link.id, at, transport);
  await expect(deliverInvitation(db, owner, link.id, new Date(at.getTime() + 23 * 3600_000), transport)).rejects.toMatchObject({ code: 'EMAIL_REPLACEMENT_REQUIRED' });
  await db.transaction(tx => revokeInvitation(tx, owner, link.id, now));
  await expect(deliverInvitation(db, owner, link.id, at, transport)).rejects.toMatchObject({ status: 410 });
  expect(transport).toHaveBeenCalledTimes(1);
});
it('keeps permanent provider rejection separate from invitation acceptance and requires a fresh replacement', async () => {
  const link = await issue({ email: 'invitee@example.invalid', deliveryConsent: true });
  const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 422 }));
  expect(await deliverInvitation(db, owner, link.id, new Date(), transport)).toEqual({ status: 'failed', delivered: false });
  await expect(deliverInvitation(db, owner, link.id, new Date(Date.now() + 30_000), transport)).rejects.toMatchObject({ code: 'EMAIL_REPLACEMENT_REQUIRED' });
  expect(await invitation(db, link.token, now)).toMatchObject({ intendedAddress: null });
  expect(await db.query.memberships.findMany()).toHaveLength(1);
  expect(transport).toHaveBeenCalledTimes(1);
});
