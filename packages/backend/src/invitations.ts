import { randomBytes } from 'node:crypto';
import { and, desc, eq, gt, inArray, isNull, or } from 'drizzle-orm';
import { z } from 'zod';
import type { Database } from './database.js';
import { accounts, plans, memberships, invitations, invitationDeliveries, transactionRequests } from './schema.js';
import { bindAccount, privatePlan, type Identity } from './plans.js';
import { addressSchema, termsSchema } from '../../domain/src/terms.js';
import { planSnapshot } from '../../chain/src/client.js';
import { ApiError, digest } from './security.js';
import { contactDigest, prepareDelivery } from './invitation-delivery.js';

export const invitationInput = z.object({ planId: z.string().uuid(), role: z.enum(['payee', 'supporter']), address: addressSchema.optional(), email: z.string().trim().toLowerCase().email().max(254).optional(), deliveryConsent: z.boolean().optional(), replace: z.string().regex(/^[a-f0-9]{64}$/).optional() }).strict().superRefine((i, ctx) => {
  if (i.deliveryConsent && !i.email) ctx.addIssue({ code: 'custom', path: ['email'], message: 'Email required for delivery' });
});
type InvitationRow = typeof invitations.$inferSelect;
export const openInvitation = (now: Date) => and(isNull(invitations.consumedBy), isNull(invitations.revokedAt), isNull(invitations.declinedAt), gt(invitations.expiresAt, now));
export function invitationTarget(actor: Identity) {
  return or(eq(invitations.intendedAddress, actor.address.toLowerCase()), actor.verifiedEmailDigests?.length ? and(isNull(invitations.intendedAddress), inArray(invitations.intendedEmailDigest, actor.verifiedEmailDigests)) : undefined);
}
export function invitationStatus(row: InvitationRow, now: Date) {
  return row.consumedBy ? 'accepted' : row.replacedBy ? 'replaced' : row.revokedAt ? 'revoked' : row.declinedAt ? 'declined' : row.expiresAt <= now ? 'expired' : 'open';
}
async function lockPlan(db: Database, id: string) {
  const [plan] = await db.select().from(plans).where(eq(plans.id, id)).for('update');
  if (!plan) throw new ApiError(404, 'INVITATION_NOT_FOUND');
  return plan;
}
async function eligiblePlan(plan: typeof plans.$inferSelect, role: InvitationRow['role'], now: Date) {
  if (Number(BigInt(String(plan.terms.fundingDeadline))) * 1000 <= now.getTime()) throw new ApiError(410, 'INVITATION_EXPIRED');
  if (role === 'supporter') {
    if (!plan.address) throw new ApiError(409, 'PUBLISH_BEFORE_SUPPORT_INVITATION');
    const current = await planSnapshot(plan.address);
    if (current.lifecycle !== 0 || current.timestamp >= BigInt(String(plan.terms.fundingDeadline))) throw new ApiError(409, 'INVITATION_FUNDING_CLOSED');
  } else if (plan.address) throw new ApiError(409, 'PAYEE_ALREADY_BOUND');
}
export async function createInvitation(db: Database, actor: Identity, raw: unknown, token: string, at?: Date) {
  const input = invitationInput.parse(raw);
  await privatePlan(db, actor, input.planId);
  const plan = await lockPlan(db, input.planId);
  const now = at || new Date();
  if (plan.ownerId !== actor.id) throw new ApiError(403, 'RECIPIENT_ONLY');
  await eligiblePlan(plan, input.role, now);
  const intendedAddress = input.address || (input.role === 'payee' ? plan.payee : null);
  if (intendedAddress === actor.address.toLowerCase() || (input.role === 'payee' && plan.payee && intendedAddress !== plan.payee) || (input.role === 'supporter' && intendedAddress === plan.payee)) throw new ApiError(400, 'INVITATION_ROLE_MISMATCH');
  const intendedEmailDigest = input.email ? contactDigest(input.email) : null;
  if (intendedEmailDigest && actor.verifiedEmailDigests?.includes(intendedEmailDigest)) throw new ApiError(400, 'INVITATION_ROLE_MISMATCH');
  if (input.replace) {
    const old = await db.query.invitations.findFirst({ where: and(eq(invitations.digest, input.replace), eq(invitations.planId, plan.id)) });
    if (!old || old.role !== input.role) throw new ApiError(404, 'INVITATION_NOT_FOUND');
    if (old.consumedBy || old.replacedBy) throw new ApiError(409, 'INVITATION_ALREADY_USED');
    await db.update(invitations).set({ revokedAt: now, replacedBy: digest(token) }).where(eq(invitations.digest, old.digest));
  } else if (input.role === 'payee' || intendedAddress || intendedEmailDigest) {
    const samePerson = input.role === 'payee' ? undefined : or(intendedAddress ? eq(invitations.intendedAddress, intendedAddress) : undefined, intendedEmailDigest ? eq(invitations.intendedEmailDigest, intendedEmailDigest) : undefined);
    const existing = await db.query.invitations.findFirst({ where: and(eq(invitations.planId, plan.id), eq(invitations.role, input.role), openInvitation(now), samePerson) });
    if (existing) throw new ApiError(409, 'REPLACE_EXISTING_INVITATION');
  }
  const issuedAt = at || new Date();
  const expiresAt = new Date(Math.min(issuedAt.getTime() + 24 * 3600_000, Number(BigInt(String(plan.terms.fundingDeadline))) * 1000));
  if (expiresAt <= issuedAt) throw new ApiError(410, 'INVITATION_EXPIRED');
  const id = digest(token);
  await db.insert(invitations).values({ digest: id, planId: plan.id, role: input.role, intendedAddress, intendedEmailDigest, expiresAt });
  if (input.deliveryConsent && input.email) await prepareDelivery(db, id, input.email, token, input.role, expiresAt);
  return { id, role: input.role, expiresAt: expiresAt.toISOString(), delivery: input.deliveryConsent ? 'ready' : 'none' };
}
// Compatibility for existing address-bound callers; the API uses createInvitation.
export async function invite(db: Database, actor: Identity, planId: string, role: 'supporter' | 'payee', address: string, now = new Date(), derivedToken?: string) {
  const token = derivedToken || randomBytes(32).toString('base64url');
  const metadata = await db.transaction(tx => createInvitation(tx, actor, { planId, role, address }, token, now));
  return { ...metadata, token };
}
function assertOpen(row: InvitationRow | undefined, now: Date): asserts row is InvitationRow {
  if (!row) throw new ApiError(404, 'INVITATION_NOT_FOUND');
  const state = invitationStatus(row, now);
  if (state !== 'open') throw new ApiError(410, state === 'accepted' || state === 'expired' ? 'INVITATION_EXPIRED_OR_USED' : `INVITATION_${state.toUpperCase()}`);
}
function assertTarget(row: InvitationRow, actor: Identity) {
  if (row.intendedAddress && row.intendedAddress !== actor.address.toLowerCase()) throw new ApiError(403, 'INVITED_ACCOUNT_REQUIRED');
  if (row.intendedEmailDigest && !actor.verifiedEmailDigests?.includes(row.intendedEmailDigest)) throw new ApiError(403, 'INVITED_EMAIL_REQUIRED');
}
async function preview(db: Database, row: InvitationRow | undefined, now: Date) {
  assertOpen(row, now);
  const plan = await db.query.plans.findFirst({ where: eq(plans.id, row.planId) });
  if (!plan) throw new ApiError(404, 'INVITATION_NOT_FOUND');
  const creator = await db.query.accounts.findFirst({ where: eq(accounts.id, plan.ownerId) });
  return { planId: row.planId, role: row.role, label: plan.label, requestedBy: creator?.displayName || 'The plan owner', payee: plan.payee, intendedAddress: row.intendedAddress, requiresVerifiedEmail: !!row.intendedEmailDigest, terms: termsSchema.parse(plan.terms), address: plan.address, expiresAt: row.expiresAt };
}
export async function invitation(db: Database, token: string, now = new Date()) {
  if (!/^[a-zA-Z0-9_-]{43}$/.test(token)) throw new ApiError(404, 'INVITATION_NOT_FOUND');
  return preview(db, await db.query.invitations.findFirst({ where: eq(invitations.digest, digest(token)) }), now);
}
export async function inboxPreview(db: Database, actor: Identity, id: string, now = new Date()) {
  const row = await db.query.invitations.findFirst({ where: and(eq(invitations.digest, id), invitationTarget(actor)) });
  if (row) assertTarget(row, actor);
  return preview(db, row, now);
}
export async function respondInvitation(db: Database, actor: Identity, source: { token?: string; id?: string }, decline = false, at?: Date) {
  return db.transaction(async tx => {
    const id = source.token && /^[a-zA-Z0-9_-]{43}$/.test(source.token) ? digest(source.token) : source.id;
    if (!id) throw new ApiError(404, 'INVITATION_NOT_FOUND');
    let row = await tx.query.invitations.findFirst({ where: and(eq(invitations.digest, id), source.token ? undefined : invitationTarget(actor)) });
    if (!row) throw new ApiError(404, 'INVITATION_NOT_FOUND');
    const plan = await lockPlan(tx, row.planId);
    row = await tx.query.invitations.findFirst({ where: eq(invitations.digest, id) });
    const now = at || new Date();
    assertOpen(row, now); assertTarget(row, actor);
    await bindAccount(tx, actor);
    if (actor.id === plan.ownerId || actor.address === plan.payee && row.role === 'supporter') throw new ApiError(400, 'INVITATION_ROLE_MISMATCH');
    if (decline) {
      const declinedAt = at || new Date();
      assertOpen(row, declinedAt);
      const changed = await tx.update(invitations).set({ declinedAt }).where(and(eq(invitations.digest, id), openInvitation(declinedAt))).returning();
      if (changed.length !== 1) throw new ApiError(409, 'INVITATION_ALREADY_USED');
      return { planId: plan.id, role: row.role, declined: true };
    }
    await eligiblePlan(plan, row.role, now);
    const overlap = await tx.query.memberships.findFirst({ where: and(eq(memberships.planId, plan.id), eq(memberships.userId, actor.id)) });
    if (overlap && overlap.role !== row.role) throw new ApiError(400, 'INVITATION_ROLE_MISMATCH');
    if (row.role === 'payee') {
      if (plan.payee && plan.payee !== actor.address) throw new ApiError(403, 'BOUND_PAYEE_REQUIRED');
      if (!plan.payee) {
        const request = await tx.query.transactionRequests.findFirst({ where: eq(transactionRequests.planId, plan.id) });
        if (plan.address || plan.proposalHash || request) throw new ApiError(409, 'PAYEE_ALREADY_BOUND');
        await tx.update(plans).set({ payee: actor.address }).where(and(eq(plans.id, plan.id), isNull(plans.payee), isNull(plans.proposalHash), isNull(plans.address)));
      }
    }
    const consumedAt = at || new Date();
    assertOpen(row, consumedAt);
    const consumed = await tx.update(invitations).set({ consumedBy: actor.id, consumedAt, intendedAddress: actor.address }).where(and(eq(invitations.digest, id), openInvitation(consumedAt))).returning();
    if (consumed.length !== 1) throw new ApiError(409, 'INVITATION_ALREADY_USED');
    await tx.insert(memberships).values({ planId: plan.id, userId: actor.id, role: row.role }).onConflictDoNothing();
    return { planId: plan.id, role: row.role, onchainAcceptanceRequired: row.role === 'payee' };
  });
}
export const acceptInvitation = (db: Database, actor: Identity, token: string, now?: Date) => respondInvitation(db, actor, { token }, false, now);
export const acceptInbox = (db: Database, actor: Identity, id: string, now?: Date) => respondInvitation(db, actor, { id }, false, now);
export async function revokeInvitation(db: Database, actor: Identity, id: string, now = new Date()) {
  const row = await db.query.invitations.findFirst({ where: eq(invitations.digest, id) });
  if (!row) throw new ApiError(404, 'INVITATION_NOT_FOUND');
  await privatePlan(db, actor, row.planId);
  const plan = await lockPlan(db, row.planId);
  if (plan.ownerId !== actor.id) throw new ApiError(403, 'RECIPIENT_ONLY');
  const [current] = await db.select().from(invitations).where(eq(invitations.digest, id));
  if (!current || current.consumedBy) throw new ApiError(409, 'INVITATION_ALREADY_USED');
  if (!current.revokedAt && !current.declinedAt) await db.update(invitations).set({ revokedAt: now }).where(eq(invitations.digest, id));
  return { revoked: true };
}
export async function ownerInvitations(db: Database, actor: Identity, planId: string, now = new Date()) {
  const plan = await privatePlan(db, actor, planId);
  if (plan.ownerId !== actor.id) throw new ApiError(403, 'RECIPIENT_ONLY');
  const rows = await db.select({ invitation: invitations, delivery: invitationDeliveries.status, attempts: invitationDeliveries.attempts, nextAttemptAt: invitationDeliveries.nextAttemptAt }).from(invitations).leftJoin(invitationDeliveries, eq(invitations.digest, invitationDeliveries.invitationId)).where(eq(invitations.planId, planId)).orderBy(desc(invitations.expiresAt), desc(invitations.digest)).limit(50);
  return rows.map(({ invitation: r, ...delivery }) => ({ id: r.digest, role: r.role, intendedAddress: r.intendedAddress, contact: r.intendedEmailDigest ? 'email' : r.intendedAddress ? 'account' : 'link', status: invitationStatus(r, now), expiresAt: r.expiresAt, ...delivery }));
}
