import { and, desc, eq, gt, isNull, lt, ne, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import type { Database } from './database.js';
import { accounts, invitations, memberships, notifications, plans, setupDrafts } from './schema.js';
import { ApiError } from './security.js';
import type { Identity } from './plans.js';
import { planSummarySnapshot } from '../../chain/src/client.js';
import { outstandingRequest } from './transactions.js';

export const setupFields = z.object({ label: z.string().max(80), payee: z.string().max(42), amount: z.string().max(50), firstDue: z.string().max(30), days: z.string().max(12), count: z.string().max(3), grace: z.string().max(12), minimum: z.string().max(50), maximum: z.string().max(50), cap: z.string().max(50), percent: z.string().max(12) }).strict();
export async function saveSetup(db: Database, actor: Identity, input: unknown) {
  const value = z.object({ fields: setupFields, step: z.number().int().min(0).max(3), version: z.number().int().min(0).max(2147483646) }).strict().parse(input);
  const existing = await db.query.setupDrafts.findFirst({ where: eq(setupDrafts.userId, actor.id) });
  if ((existing?.version ?? 0) !== value.version) throw new ApiError(409, 'SETUP_CHANGED_IN_ANOTHER_TAB');
  const saved = await db.insert(setupDrafts).values({ userId: actor.id, fields: value.fields, step: value.step, version: value.version + 1 }).onConflictDoUpdate({ target: setupDrafts.userId, set: { fields: value.fields, step: value.step, version: value.version + 1, updatedAt: new Date() }, setWhere: eq(setupDrafts.version, value.version) }).returning({ version: setupDrafts.version });
  if (!saved.length) throw new ApiError(409, 'SETUP_CHANGED_IN_ANOTHER_TAB');
  return saved[0]!;
}
export async function connectedPeople(db: Database, actor: Identity) {
  const mine = alias(memberships, 'my_membership'), other = alias(memberships, 'connected_membership');
  // Owners already know their invitees. Other participants can reconnect only
  // with the owner/payee; a shared plan is not a directory of other supporters.
  return db.selectDistinct({ address: accounts.address, displayName: accounts.displayName }).from(mine).innerJoin(other, eq(mine.planId, other.planId)).innerJoin(accounts, eq(accounts.id, other.userId)).where(and(eq(mine.userId, actor.id), ne(other.userId, actor.id), or(eq(mine.role, 'recipient'), eq(other.role, 'recipient'), eq(other.role, 'payee')))).limit(50);
}
export async function requestInbox(db: Database, actor: Identity, now = new Date()) {
  return db.select({ id: invitations.digest, planId: plans.id, label: plans.label, role: invitations.role, expiresAt: invitations.expiresAt, requestedBy: accounts.displayName }).from(invitations).innerJoin(plans, eq(invitations.planId, plans.id)).innerJoin(accounts, eq(plans.ownerId, accounts.id)).where(and(eq(invitations.intendedAddress, actor.address.toLowerCase()), isNull(invitations.consumedBy), gt(invitations.expiresAt, now))).orderBy(invitations.expiresAt, invitations.digest).limit(50);
}
export async function activityFeed(db: Database, actor: Identity, cursor: string | null) {
  let boundary;
  if (cursor) {
    const id = z.string().min(1).max(300).parse(cursor);
    const row = await db.query.notifications.findFirst({ where: and(eq(notifications.id, id), eq(notifications.userId, actor.id)) });
    if (!row) throw new ApiError(404, 'ACTIVITY_CURSOR_UNAVAILABLE');
    boundary = or(lt(notifications.createdAt, row.createdAt), and(eq(notifications.createdAt, row.createdAt), lt(notifications.id, row.id)));
  }
  const rows = await db.select({ id: notifications.id, planId: notifications.planId, type: notifications.type, transactionHash: notifications.transactionHash, createdAt: notifications.createdAt, readAt: notifications.readAt, label: plans.label }).from(notifications).innerJoin(plans, eq(notifications.planId, plans.id)).where(and(eq(notifications.userId, actor.id), boundary)).orderBy(desc(notifications.createdAt), desc(notifications.id)).limit(21);
  return { items: rows.slice(0, 20), next: rows.length > 20 ? rows[19]!.id : null };
}
export async function planSummaries(db: Database, actor: Identity, offset: number) {
  const rows = await db.select({ id: plans.id, label: plans.label, address: plans.address, role: memberships.role, terms: plans.terms, proposalHash: plans.proposalHash }).from(memberships).innerJoin(plans, eq(memberships.planId, plans.id)).where(eq(memberships.userId, actor.id)).orderBy(desc(plans.createdAt), plans.id).offset(offset).limit(11);
  const items = [];
  // At most ten plans per page, two concurrent snapshot reads; no per-card polling.
  for (let i = 0; i < Math.min(10, rows.length); i += 2) items.push(...await Promise.all(rows.slice(i, Math.min(i + 2, 10)).map(async p => {
    const pending = await outstandingRequest(db, actor.id, p.id);
    let summary = null;
    if (p.address) try {
      const c = await planSummarySnapshot(p.address, actor.address);
      summary = { lifecycle: c.lifecycle, due: c.preview.due, own: c.own, reserve: c.reserve, claimable: c.claimable, contribution: c.lifecycle === 0 ? c.share[0] : c.share[1], totalPaid: c.totalPaid, observedAt: c.observedAt, nextInstallment: c.preview.index, count: Number(p.terms.count) };
    } catch { /* An unavailable balance is unknown, never zero. */ }
    return { ...p, summary, outstanding: pending ? { id: pending.id, action: pending.action } : null };
  })));
  return { items, next: rows.length > 10 ? offset + 10 : null };
}
