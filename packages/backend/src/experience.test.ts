import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import * as schema from './schema.js';
import type { Database } from './database.js';
import { createDraft, bindAccount, invite, inboxPreview, acceptInbox } from './plans.js';
import { activityFeed, connectedPeople, planSummaries, requestInbox, saveSetup } from './experience.js';
import * as chain from '../../chain/src/client.js';

const owner = { id: 'ux-owner', address: '0x0000000000000000000000000000000000000100' };
const payee = { id: 'ux-payee', address: '0x0000000000000000000000000000000000000200' };
const stranger = { id: 'ux-stranger', address: '0x0000000000000000000000000000000000000300' };
const now = new Date('2026-10-11T06:00:00Z');
const draft = { label: 'Disposable UX test fixture', payee: payee.address, terms: { amount: '1000000', minimumReserve: '1000000', maximumReserve: '2000000', perPaymentCap: '1000000', firstDue: '1800000000', interval: '86400', grace: '3600', fundingDeadline: '1795000000', coverBps: 10000, count: 2 } };
const fields = { label: 'Unfinished private fixture', payee: '', amount: '', firstDue: '', days: '30', count: '3', grace: '48', minimum: '', maximum: '', cap: '', percent: '100' };
let pg: PGlite, db: Database;
beforeEach(async () => { pg = new PGlite(); db = drizzle(pg, { schema }); await migrate(drizzle(pg, { schema }), { migrationsFolder: 'infra/migrations' }); for (const a of [owner, payee, stranger]) await bindAccount(db, a); });
afterEach(async () => { vi.restoreAllMocks(); await pg.close(); });

it('discovers requests only for the bound invitee and retains expiry, role binding and replay protection without link tokens', async () => {
  const plan = await db.transaction(tx => createDraft(tx, owner, draft, now));
  const issued = await invite(db, owner, plan.id, 'payee', payee.address, now);
  const inbox = await requestInbox(db, payee, now);
  expect(inbox).toHaveLength(1); expect(JSON.stringify(inbox)).not.toContain(issued.token);
  expect(await requestInbox(db, stranger, now)).toEqual([]);
  await expect(inboxPreview(db, stranger, inbox[0]!.id, now)).rejects.toMatchObject({ code: 'INVITATION_NOT_FOUND' });
  await expect(acceptInbox(db, stranger, inbox[0]!.id, now)).rejects.toMatchObject({ code: 'INVITATION_NOT_FOUND' });
  await expect(db.transaction(tx => acceptInbox(tx, payee, inbox[0]!.id, new Date(issued.expiresAt)))).rejects.toMatchObject({ code: 'INVITATION_EXPIRED_OR_USED' });
  expect(await db.transaction(tx => acceptInbox(tx, payee, inbox[0]!.id, now))).toMatchObject({ planId: plan.id, role: 'payee', onchainAcceptanceRequired: true });
  expect(await requestInbox(db, payee, now)).toEqual([]);
  await expect(acceptInbox(db, payee, inbox[0]!.id, now)).rejects.toMatchObject({ code: 'INVITATION_EXPIRED_OR_USED' });
  expect(await connectedPeople(db, owner)).toEqual([{ address: payee.address, displayName: null }]);
  expect(await connectedPeople(db, stranger)).toEqual([]);
  expect(await db.select().from(schema.transactionRequests)).toHaveLength(0);
});
it('saves partial setup privately, rejects competing revisions and cannot resurrect a deleted draft using a stale version', async () => {
  expect(await db.transaction(tx => saveSetup(tx, owner, { fields, step: 0, version: 0 }))).toEqual({ version: 1 });
  expect(await db.query.setupDrafts.findFirst({ where: eq(schema.setupDrafts.userId, stranger.id) })).toBeUndefined();
  await expect(db.transaction(tx => saveSetup(tx, owner, { fields: { ...fields, label: 'Stale tab' }, step: 1, version: 0 }))).rejects.toMatchObject({ code: 'SETUP_CHANGED_IN_ANOTHER_TAB' });
  expect(await db.transaction(tx => saveSetup(tx, owner, { fields, step: 1, version: 1 }))).toEqual({ version: 2 });
  await db.delete(schema.setupDrafts).where(eq(schema.setupDrafts.userId, owner.id));
  await expect(db.transaction(tx => saveSetup(tx, owner, { fields, step: 1, version: 2 }))).rejects.toMatchObject({ code: 'SETUP_CHANGED_IN_ANOTHER_TAB' });
  await expect(saveSetup(db, owner, { fields: { ...fields, credential: 'excluded-fixture' }, step: 0, version: 0 })).rejects.toThrow();
  expect(await db.select().from(schema.plans)).toHaveLength(0);
});
it('paginates activity newest first with equal timestamps, without exposing another actor’s cursor or duplicating rows', async () => {
  const p = await db.transaction(tx => createDraft(tx, owner, draft, now));
  await db.insert(schema.notifications).values(Array.from({ length: 25 }, (_, i) => ({ id: `ux-${String(i).padStart(3, '0')}`, userId: owner.id, planId: p.id, type: 'Closed', createdAt: now })));
  await db.insert(schema.notifications).values({ id: 'stranger-notification', userId: stranger.id, planId: p.id, type: 'Closed', createdAt: now });
  const first = await activityFeed(db, owner, null), second = await activityFeed(db, owner, first.next);
  expect(first.items).toHaveLength(20); expect(second.items).toHaveLength(5); expect(first.items[0]!.id).toBe('ux-024');
  expect(new Set([...first.items, ...second.items].map(i => i.id)).size).toBe(25); expect(second.next).toBeNull();
  expect(first.items.every(i => i.readAt === null)).toBe(true);
  await expect(activityFeed(db, owner, 'stranger-notification')).rejects.toMatchObject({ code: 'ACTIVITY_CURSOR_UNAVAILABLE' });
});
it('bounds summary pages and keeps unavailable financial state unknown during RPC failures', async () => {
  for (let i = 0; i < 12; i++) { const p = await db.transaction(tx => createDraft(tx, owner, draft, now)); await db.update(schema.plans).set({ address: `0x${String(i + 100).padStart(40, '0')}` }).where(eq(schema.plans.id, p.id)); }
  const read = vi.spyOn(chain, 'planSummarySnapshot').mockRejectedValue(new Error('RPC fixture outage'));
  const first = await planSummaries(db, owner, 0), second = await planSummaries(db, owner, first.next!);
  expect(first.items).toHaveLength(10); expect(second.items).toHaveLength(2); expect(first.items.every(i => i.summary === null)).toBe(true);
  expect(new Set([...first.items, ...second.items].map(i => i.id)).size).toBe(12); expect(read).toHaveBeenCalledTimes(12);
  expect((await planSummaries(db, stranger, 0)).items).toEqual([]);
});
